import { prisma } from '../lib/prisma.js';
import { ethers } from 'ethers';
import Contest from '../../../client/src/utils/contracts/Contest.json' with { type: 'json' };
import PlatformToken from '../../../client/src/utils/contracts/PlatformToken.json' with { type: 'json' };

export interface ContestSettings {
  fee: number;
  maxEntry: number;
  paymentTokenAddress: string;
  paymentTokenSymbol: string;
  chainId: number;
}

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY!, provider);

export async function distributeContest() {
  try {
    // Get all open contests
    const contests = await prisma.contest.findMany({
      where: {
        status: 'OPEN',
      },
      include: {
        tournament: true,
        contestLineups: {
          include: {
            user: true,
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

    for (const contest of contests) {
      try {
        // Validate contest data
        if (!contest || !contest.tournament) {
          await updateContestToError(contest?.id, 'Contest has invalid data - missing contest or tournament information');
          continue;
        }

        // Check if tournament is completed
        if (contest.tournament.status !== 'COMPLETED') {
          continue; // Skip if tournament not completed - this is expected behavior
        }

        // Validate contest address
        if (!contest.address) {
          await updateContestToError(contest.id, 'Missing contract address');
          continue;
        }

        // Initialize contest contract
        const contestContract = new ethers.Contract(
          contest.address,
          Contest.abi,
          wallet
        );

        // Get contest state from blockchain
        const contestState = await contestContract.state();
        if (contestState !== 0) {
          // 0 = OPEN
          continue; // Skip if contest already settled - this is expected behavior
        }

        // Get the participants from the contestContract
        const participants = await contestContract.participants();
        
        // Validate participants data
        if (!participants || !Array.isArray(participants)) {
          await updateContestToError(contest.id, 'Invalid participants data from blockchain');
          continue;
        }

        // Check for data integrity: if there are participants, there should be lineups
        if (participants.length > 0 && (!contest.contestLineups || contest.contestLineups.length === 0)) {
          await updateContestToError(contest.id, 'Data integrity error: Contest has participants but no lineups');
          continue;
        }

        // Calculate payouts based on scores
        const payouts = await calculatePayouts(
          contest.contestLineups || [],
          participants
        );

        // Validate payouts array
        if (!Array.isArray(payouts) || payouts.length !== participants.length) {
          await updateContestToError(contest.id, 'Invalid payouts calculation - array mismatch');
          continue;
        }

        // Distribute prizes on blockchain
        const distributeTx = await contestContract.distribute(payouts);
        await distributeTx.wait();

        // Mint rewards on blockchain equal to the entry fee to each participant
        const platformTokenContract = new ethers.Contract(
          process.env.PLATFORM_TOKEN_ADDRESS!,
          PlatformToken.abi,
          wallet
        );
        
        // Calculate fees for each participant
        const settings = contest.settings as unknown as ContestSettings;
        const fees = participants.map((participant: string) => {
          return settings?.fee || 0;
        });
        
        const mintTx = await platformTokenContract.mintRewards(participants, fees);
        await mintTx.wait();

        // Update contest status in database
        await prisma.contest.update({
          where: { id: contest.id },
          data: {
            status: 'SETTLED',
            results: { payouts, participants, distributeTx, mintTx },
          },
        });

        console.log(`Distributed contest: ${contest.id} - ${contest.name}`);
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

export async function calculatePayouts(
  lineups: any[],
  participants: string[]
): Promise<number[]> {
  // Create a map of wallet addresses to their lineup scores
  const walletToScore = new Map<string, number>();
  lineups.forEach((lineup) => {
    // Handle edge cases: missing user, missing walletAddress, or invalid walletAddress
    if (lineup?.user?.walletAddress) {
      try {
        walletToScore.set(lineup.user.walletAddress.toLowerCase(), lineup.score || 0);
      } catch (error) {
        console.warn(`Invalid wallet address in lineup: ${lineup.user.walletAddress}`);
      }
    }
  });

  // Initialize payouts array with zeros
  const payouts = new Array(participants.length).fill(0);

  // Find the winner (position "1") and set their payout
  const winner = lineups.find((lineup) => lineup?.position === '1');
  if (winner?.user?.walletAddress) {
    try {
      const winnerIndex = participants.findIndex(
        (participant: string) =>
          participant.toLowerCase() === winner.user.walletAddress.toLowerCase()
      );
      if (winnerIndex !== -1) {
        payouts[winnerIndex] = 10000; // 100% in basis points
      } else {
        // Winner is not in participants list - this is a data integrity error
        throw new Error(`Winner with wallet address ${winner.user.walletAddress} is not found in participants list`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Winner with wallet address')) {
        throw error; // Re-throw data integrity errors
      }
      console.warn(`Error processing winner wallet address: ${winner.user.walletAddress}`);
    }
  }

  return payouts;
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
