import { prisma } from '../lib/prisma.js';
import { createWalletClient, http, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainConfig } from '../lib/chainConfig.js';
import Escrow from '../contracts/Escrow.json' with { type: 'json' };

export interface ContestSettings {
  fee: number;
  maxEntry?: number;
  paymentTokenAddress: string;
  paymentTokenSymbol: string;
  chainId: number;
}

// Initialize blockchain connection
function getWalletClient(chainId: number) {
  // Validate private key before creating wallet
  const privateKey = process.env.ORACLE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ORACLE_PRIVATE_KEY environment variable is required');
  }

  // Validate private key format
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    throw new Error('ORACLE_PRIVATE_KEY must be a valid 32-byte hex string starting with 0x');
  }

  // Get chain configuration
  const chainConfig = getChainConfig(chainId);

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl)
  });

  return { walletClient, account };
}

export async function distributeContest() {
  try {
    // Get all contests where tournament is COMPLETED but contest is IN_PROGRESS
    const contests = await prisma.contest.findMany({
      where: {
        status: 'IN_PROGRESS',
        tournament: {
          status: 'COMPLETED',
        },
      },
      include: {
        tournament: true,
        contestLineups: {
          include: {
            user: {
              include: {
                wallets: true,
              },
            },
            tournamentLineup: true,
          },
          orderBy: {
            score: 'desc',
          },
        },
      },
    });

    // Handle case where contests is null or undefined
    if (!contests || !Array.isArray(contests)) {
      console.log('No contests found or invalid contests data');
      return;
    }

    if (contests.length === 0) {
      console.log('No contests ready for distribution (looking for contests with status=IN_PROGRESS and tournament.status=COMPLETED)');
      return;
    }

    console.log(`Found ${contests.length} contest(s) ready for distribution`);

    for (const contest of contests) {
      try {
        // Validate contest data
        if (!contest || !contest.tournament) {
          await updateContestToError(contest?.id, 'Contest has invalid data - missing contest or tournament information');
          continue;
        }

        // Validate contest address
        if (!contest.address) {
          await updateContestToError(contest.id, 'Missing contract address');
          continue;
        }

        // Initialize escrow contract with contest's chain ID
        const { walletClient } = getWalletClient(contest.chainId);
        const escrowContract = getContract({
          address: contest.address as `0x${string}`,
          abi: Escrow.abi,
          client: walletClient
        });

        // Get escrow state from blockchain
        try {
          const escrowState = await escrowContract.read.state!() as bigint;
          console.log(`Escrow state for ${contest.address}: ${Number(escrowState)} (0=OPEN, 1=IN_PROGRESS, 2=SETTLED, 3=CANCELLED)`);
          
          if (Number(escrowState) !== 1) {
            // 0 = OPEN, 1 = IN_PROGRESS, 2 = SETTLED, 3 = CANCELLED
            await updateContestToError(contest.id, `Contest in DB is IN_PROGRESS but blockchain state is ${Number(escrowState)} (expected 1)`);
            continue;
          }
        } catch (error) {
          console.error(`Error reading escrow state for ${contest.address}:`, error);
          await updateContestToError(contest.id, `Failed to read escrow state: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }

        // Validate we have lineups to process
        if (!contest.contestLineups || contest.contestLineups.length === 0) {
          await updateContestToError(contest.id, 'No lineups found for contest');
          continue;
        }

        // Calculate payouts based on scores
        const payoutResult = await calculatePayouts(contest.contestLineups, contest.chainId);

        // Validate total basis points equals 10000
        const totalBasisPoints = payoutResult.payoutBasisPoints.reduce((sum, payout) => sum + payout, 0);
        if (totalBasisPoints !== 10000) {
          await updateContestToError(contest.id, `Invalid total basis points: ${totalBasisPoints} (expected 10000)`);
          continue;
        }

        // Validate we have winners
        if (payoutResult.addresses.length === 0) {
          await updateContestToError(contest.id, 'No winners to distribute to');
          continue;
        }

        const addresses = payoutResult.addresses as `0x${string}`[];
        const payoutBasisPoints = payoutResult.payoutBasisPoints.map(bp => BigInt(bp));

        // Distribute prizes on blockchain
        let hash: string;
        try {
          hash = await escrowContract.write.distribute!([addresses, payoutBasisPoints]) as string;
        } catch (error) {
          console.error(`Error distributing for ${contest.address}:`, error);
          await updateContestToError(contest.id, `Failed to distribute: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }

        // Update contest status in database
        await prisma.contest.update({
          where: { id: contest.id },
          data: {
            status: 'SETTLED',
            results: JSON.parse(JSON.stringify({ 
              addresses: payoutResult.addresses,
              payoutBasisPoints: payoutResult.payoutBasisPoints,
              detailedResults: payoutResult.detailedResults,
              distributeTx: { hash } 
            })),
          },
        });

        console.log(`✅ Successfully distributed and settled contest: ${contest.id} - ${contest.name}`);
        console.log(`   - Chain ID: ${contest.chainId}`);
        console.log(`   - Winners: ${addresses.length}`);
        console.log(`   - Total entries: ${contest.contestLineups.length}`);
        console.log(`   - Total payout distributed: ${payoutResult.payoutBasisPoints.reduce((sum, payout) => sum + payout, 0)} basis points`);
        console.log(`   - Transaction hash: ${hash}`);
      } catch (contestError) {
        console.error(`Error processing contest ${contest?.id}:`, contestError);
        await updateContestToError(contest?.id, `Processing error: ${contestError instanceof Error ? contestError.message : String(contestError)}`);
        // Continue with next contest instead of failing completely
        continue;
      }
    }
  } catch (error) {
    console.error('Error closing contests:', error);
    throw error;
  }
}

async function updateContestToError(contestId: string | undefined, errorReason: string) {
  if (!contestId) {
    console.error('Cannot update contest to ERROR: missing contest ID');
    return;
  }

  try {
    await prisma.contest.update({
      where: { id: contestId },
      data: {
        status: 'ERROR',
        results: { error: errorReason, timestamp: new Date().toISOString() },
      },
    });
    console.error(`Contest ${contestId} marked as ERROR: ${errorReason}`);
  } catch (updateError) {
    console.error(`Failed to update contest ${contestId} to ERROR status:`, updateError);
  }
}

export interface DetailedResult {
  username: string;
  lineupName: string;
  position: number;
  score: number;
  payoutBasisPoints: number;
}

// Helper function to get wallet address for a user based on contest chain
function getWalletAddress(user: any, chainId: number): string {
  if (!user?.wallets || !Array.isArray(user.wallets) || user.wallets.length === 0) {
    throw new Error(`User ${user?.name || user?.id || 'Unknown'} has no wallets`);
  }

  // Find wallet for the specific chain
  const chainWallet = user.wallets.find((w: any) => w.chainId === chainId);
  if (!chainWallet?.publicKey) {
    throw new Error(`User ${user?.name || user?.id || 'Unknown'} has no wallet for chainId ${chainId}`);
  }

  return chainWallet.publicKey;
}

export async function calculatePayouts(
  lineups: any[],
  chainId: number
): Promise<{ 
  addresses: string[]; 
  payoutBasisPoints: number[];
  detailedResults: DetailedResult[];
}> {
  // Validate lineups data integrity
  const validLineups = lineups.filter((lineup) => {
    if (!lineup?.user) {
      throw new Error('Data integrity error: Lineup missing user field');
    }
    if (lineup?.score === undefined || lineup?.score === null) {
      throw new Error('Data integrity error: Lineup missing score field');
    }
    // Validate wallet exists for this chain (will throw if not found)
    getWalletAddress(lineup.user, chainId);
    return true;
  });

  if (validLineups.length === 0) {
    throw new Error('Data integrity error: No valid lineups found');
  }

  // Sort lineups by score (descending - highest score wins)
  const sortedLineups = [...validLineups].sort((a, b) => b.score - a.score);

  // Define payout structure based on total lineup count
  const isLargeContest = validLineups.length >= 10;
  const payoutStructure = isLargeContest 
    ? [7000, 2000, 1000] // 70%, 20%, 10% for large contests (positions 1, 2, 3)
    : [10000]; // 100% for small contests (position 1 only)

  // Result arrays
  const addresses: string[] = [];
  const payoutBasisPoints: number[] = [];
  const detailedResults: DetailedResult[] = [];

  // Process lineups by score groups (ties)
  let currentPosition = 1; // 1-based position
  let i = 0;
  let totalDistributed = 0; // Track total basis points distributed

  while (i < sortedLineups.length) {
    const currentScore = sortedLineups[i].score;
    const tiedLineups: any[] = [];

    // Collect all lineups with the same score
    while (i < sortedLineups.length && sortedLineups[i].score === currentScore) {
      tiedLineups.push(sortedLineups[i]);
      i++;
    }

    const tieCount = tiedLineups.length;

    // Calculate pooled payout for the positions this tied group occupies
    // If tie extends beyond payout positions, pool only available positions
    let pooledPayout = 0;
    for (let pos = currentPosition; pos < currentPosition + tieCount; pos++) {
      const posIndex = pos - 1; // Convert to 0-based index
      if (posIndex < payoutStructure.length) {
        const positionPayout = payoutStructure[posIndex];
        if (positionPayout !== undefined) {
          pooledPayout += positionPayout;
        }
      }
    }

    // Calculate base payout per player and remainder (even if 0)
    // Floor to nearest 100 basis points (1 cent) to avoid fractions
    const basePayoutPerPlayer = pooledPayout > 0 ? Math.floor(Math.floor(pooledPayout / tieCount) / 100) * 100 : 0;
    const totalBaseForGroup = basePayoutPerPlayer * tieCount;
    const remainderBasisPoints = pooledPayout - totalBaseForGroup;
    
    // Distribute remainder in 100 basis point increments (1 cent each)
    const remainderPayouts = Math.floor(remainderBasisPoints / 100);

    // Process each tied lineup
    for (let j = 0; j < tiedLineups.length; j++) {
      const lineup = tiedLineups[j];
      
      // Calculate payout for this player (including remainder distribution)
      // Each remainder payout is 100 basis points (1 cent)
      const payout = basePayoutPerPlayer + (j < remainderPayouts ? 100 : 0);

      // Get wallet address for this user (will throw if not found)
      const walletAddress = getWalletAddress(lineup.user, chainId);

      // Add to winners arrays if they receive a payout
      if (payout > 0) {
        addresses.push(walletAddress);
        payoutBasisPoints.push(payout);
        totalDistributed += payout;
      }

      // Add to detailed results for all players
      detailedResults.push({
        username: lineup.user?.name || 'Unknown',
        lineupName: lineup.tournamentLineup?.name || 'Unnamed Lineup',
        position: currentPosition,
        score: currentScore,
        payoutBasisPoints: payout,
      });
    }

    // Move to next position group
    currentPosition += tieCount;
  }

  // If we have any dust (undistributed basis points due to rounding), 
  // add it to the first winner to ensure total = 10000
  if (totalDistributed < 10000 && payoutBasisPoints.length > 0) {
    const dust = 10000 - totalDistributed;
    payoutBasisPoints[0] += dust;
    // Update the detailed results for the first winner
    if (detailedResults.length > 0 && detailedResults[0].payoutBasisPoints > 0) {
      detailedResults[0].payoutBasisPoints += dust;
    }
  }

  return { addresses, payoutBasisPoints, detailedResults };
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  distributeContest()
    .then(() => {
      console.log('Contest distribute completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Contest distribute failed:', error);
      process.exit(1);
    });
}
