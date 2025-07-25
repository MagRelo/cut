// this service will run periodically to close contests
// closing a contest requires an blockchain account with funds for gas; check that first
// get pk & RPC from env
// init account and check balance

// take Contest records and the contracts from "OPEN" status to "CLOSED" status

import { prisma } from '../lib/prisma.js';
import { ethers } from 'ethers';
import Escrow from '../../contracts/Escrow.json' with { type: 'json' };

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

    console.log(`Found ${contests.length} open contests`);

    for (const contest of contests) {
      // Only proceed if tournament is still in progress
      if (contest.tournament.status !== 'IN_PROGRESS') {
        continue;
      }

      console.log(`Closing contest: ${contest.id} - ${contest.name}`);

      // Initialize escrow contract
      const escrowContract = new ethers.Contract(
        contest.address,
        Escrow.abi,
        wallet
      );

      // Get escrow state from blockchain
      const escrowState = await escrowContract.state();
      if (Number(escrowState) !== 0) {
        // 0 = OPEN (assuming EscrowState enum starts with OPEN = 0)
        console.log(
          `Escrow state not open: ${contest.id}: ${Number(escrowState)}`
        );
        continue;
      }

      const oracle = await escrowContract.oracle();
      if (oracle !== process.env.ORACLE_ADDRESS) {
        console.log(
          `Oracle mismatch: ${oracle} !== ${process.env.ORACLE_ADDRESS}`
        );
        continue;
      }

      // Close deposits on blockchain (equivalent to closeEntry in old Contest)
      const closeTx = await escrowContract.closeDeposits();
      console.log(`Close tx: ${closeTx.hash}`);
      await closeTx.wait();

      // Update contest status in database
      await prisma.contest.update({
        where: { id: contest.id },
        data: { status: 'CLOSED' },
      });

      console.log(`Closed contest: ${contest.id} - ${contest.name}`);
    }
  } catch (error) {
    console.error('Error closing contests:', error);
    throw error;
  }
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  closeContest()
    .then(() => {
      console.log('Contest close completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('ContestLineups update failed:', error);
      process.exit(1);
    });
}
