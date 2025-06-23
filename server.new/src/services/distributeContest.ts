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

    for (const contest of contests) {
      // Check if tournament is completed
      if (contest.tournament.status !== 'COMPLETED') {
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
        continue;
      }

      // Get the participants from the contestContract
      const participants = await contestContract.participants();

      // Calculate payouts based on scores
      const payouts = await calculatePayouts(
        contest.contestLineups,
        participants
      );

      // Distribute prizes on blockchain
      const distributeTx = await contestContract.distribute(payouts);
      await distributeTx.wait();

      // Mint rewards on blockchain equal to the entry fee to each participant
      const platformTokenContract = new ethers.Contract(
        process.env.PLATFORM_TOKEN_ADDRESS!,
        PlatformToken.abi,
        wallet
      );
      const mintTx = await platformTokenContract.mintRewards(
        participants,
        participants.map((participant: string) => {
          const settings = contest.settings as unknown as ContestSettings;
          return settings?.fee || 0;
        })
      );
      await mintTx.wait();

      // Update contest status in database
      await prisma.contest.update({
        where: { id: contest.id },
        data: {
          status: 'SETTLED',
          results: { payouts, participants },
        },
      });

      console.log(`Distributed contest: ${contest.id} - ${contest.name}`);
    }
  } catch (error) {
    console.error('Error closing contests:', error);
    throw error;
  }
}

async function calculatePayouts(
  lineups: any[],
  participants: string[]
): Promise<number[]> {
  // Create a map of wallet addresses to their lineup scores
  const walletToScore = new Map<string, number>();
  lineups.forEach((lineup) => {
    walletToScore.set(lineup.user.walletAddress.toLowerCase(), lineup.score);
  });

  // Initialize payouts array with zeros
  const payouts = new Array(participants.length).fill(0);

  // Find the winner (position "1") and set their payout
  const winner = lineups.find((lineup) => lineup.position === '1');
  if (winner) {
    const winnerIndex = participants.findIndex(
      (participant: string) =>
        participant.toLowerCase() === winner.user.walletAddress.toLowerCase()
    );
    if (winnerIndex !== -1) {
      payouts[winnerIndex] = 10000; // 100% in basis points
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
