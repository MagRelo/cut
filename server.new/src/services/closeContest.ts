// this service will run periodically to close contests
// closing a contest requires an blockchain account with funds for gas; check that first
// get pk & RPC from env
// init account and check balance

// take Contest records and the contracts from "OPEN" status to "CLOSED" status

import { prisma } from '../lib/prisma.js';
import { ethers } from 'ethers';
import Contest from '../../../client/src/utils/contracts/Contest.json' assert { type: 'json' };

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY!, provider);

export async function closeContest() {
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
      if (contest.tournament.status !== 'IN_PROGRESS') {
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

      // Close entry on blockchain
      const closeTx = await contestContract.closeEntry();
      await closeTx.wait();

      // Update contest status in database
      await prisma.contest.update({
        where: { id: contest.id },
        data: { status: 'CLOSED' },
      });
    }
  } catch (error) {
    console.error('Error closing contests:', error);
    throw error;
  }
}
