import { prisma } from '../../lib/prisma.js';
import { ethers } from 'ethers';
import Escrow from '../../../contracts/Escrow.json' with { type: 'json' };

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

        // Validate contest address
        if (!contest.address) {
          await updateContestToError(contest.id, 'Missing contract address');
          continue;
        }

        // Initialize escrow contract
        const escrowContract = new ethers.Contract(
          contest.address,
          Escrow.abi,
          wallet
        );

        // Get escrow state from blockchain
        const escrowState = await escrowContract.state();
        if (escrowState !== 0) {
          // 0 = OPEN (assuming EscrowState enum starts with OPEN = 0)
          await updateContestToError(contest.id, 'IN_PROGRESS Contest in DB is not open in blockchain');
          continue;
        }

        // Get the participants count from the escrowContract        
        const participantsCount = await escrowContract.getParticipantsCount();        
        if (!participantsCount || Number(participantsCount) === 0) {
          await updateContestToError(contest.id, 'No participants found in escrow');
          continue;
        }

        // Get participants array by iterating through the count
        const participants: string[] = [];
        for (let i = 0; i < Number(participantsCount); i++) {
          const participant = await escrowContract.participants(i);
          participants.push(participant);
        }

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
        const distributeTx = await escrowContract.distribute(payouts);
        await distributeTx.wait();

        // Minting is now handled by the treasury
        // const platformTokenContract = new ethers.Contract(
        //   process.env.PLATFORM_TOKEN_ADDRESS!,
        //   PlatformToken.abi,
        //   wallet
        // );
        
        // // Calculate fees for each participant
        // const settings = contest.settings as unknown as ContestSettings;
        // const fees = participants.map((participant: string) => {
        //   return settings?.fee || 0;
        // });
        
        // // Mint tokens to each participant
        // for (let i = 0; i < participants.length; i++) {
        //   const mintTx = await platformTokenContract.mint(participants[i], fees[i]);
        //   await mintTx.wait();
        // }

        // Update contest status in database
        await prisma.contest.update({
          where: { id: contest.id },
          data: {
            status: 'SETTLED',
            results: { payouts, participants, distributeTx },
          },
        });

        console.log(`✅ Successfully distributed and settled contest: ${contest.id} - ${contest.name}`);
        console.log(`   - Participants: ${participants.length}`);
        console.log(`   - Total payout distributed: ${payouts.reduce((sum, payout) => sum + payout, 0)}`);
        console.log(`   - Transaction hash: ${distributeTx.hash}`);
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
  // Initialize payouts array with zeros
  const payouts = new Array(participants.length).fill(0);

  // Group lineups by position to handle ties
  const positionGroups = new Map<string, any[]>();
  
  // Validate lineups data integrity
  const validLineups = lineups.filter((lineup) => {
    if (!lineup?.position) {
      throw new Error('Data integrity error: Lineup missing position field');
    }
    if (!lineup?.user) {
      throw new Error('Data integrity error: Lineup missing user field');
    }
    if (!lineup?.user?.walletAddress) {
      throw new Error('Data integrity error: Lineup missing walletAddress');
    }
    return true;
  });

  // Check if there are any valid lineups with position "1"
  const hasWinner = validLineups.some(lineup => lineup.position === "1");
  if (!hasWinner) {
    throw new Error('Data integrity error: No lineup found with position "1" (winner)');
  }
  
  validLineups.forEach((lineup) => {
    const position = lineup.position;
    if (!positionGroups.has(position)) {
      positionGroups.set(position, []);
    }
    positionGroups.get(position)!.push(lineup);
  });

  // Define payout structure based on participant count
  const isLargeContest = participants.length >= 10;
  const payoutStructure = isLargeContest 
    ? { '1': 7000, '2': 2000, '3': 1000 } // 70%, 20%, 10% for large contests
    : { '1': 10000 }; // 100% for small contests

  // Process each position and split payouts among tied participants
  for (const [position, tiedLineups] of positionGroups) {
    const payoutPercentage = payoutStructure[position as keyof typeof payoutStructure];
    if (payoutPercentage === undefined) continue;

    // Calculate split amount per tied participant
    const splitAmount = Math.floor(payoutPercentage / tiedLineups.length);
    
    // Distribute split amount to each tied participant
    for (const lineup of tiedLineups) {
      const participantIndex = participants.findIndex(
        (participant) => participant.toLowerCase() === lineup.user.walletAddress.toLowerCase()
      );
      
      if (participantIndex === -1) {
        throw new Error(
          `${position === '1' ? 'Winner' : position === '2' ? 'Second place' : position === '3' ? 'Third place' : `${position} place`} with wallet address ${lineup.user.walletAddress} is not found in participants list`
        );
      }
      
      payouts[participantIndex] = splitAmount;
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
