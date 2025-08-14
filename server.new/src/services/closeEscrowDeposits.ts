// this service will run periodically to close contests
// closing a contest requires an blockchain account with funds for gas; check that first
// get pk & RPC from env
// init account and check balance

// take Contest records and the contracts from "OPEN" status to "CLOSED" status

import { prisma } from '../lib/prisma.js';
import { ethers } from 'ethers';
import Escrow from '../../contracts/Escrow.json' with { type: 'json' };

// Initialize blockchain connection
function getWallet() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  // Validate private key before creating wallet
  const privateKey = process.env.ORACLE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ORACLE_PRIVATE_KEY environment variable is required');
  }

  // Validate private key format
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    throw new Error('ORACLE_PRIVATE_KEY must be a valid 32-byte hex string starting with 0x');
  }

  return new ethers.Wallet(privateKey, provider);
}

export async function closeEscrowDeposits() {
  try {
    // Get all open contests with tournaments in progress
    const contests = await prisma.contest.findMany({
      where: {
        status: 'OPEN',
        tournament: {
          status: 'IN_PROGRESS',
        },
      },
      include: {
        tournament: true,
      },
    });

        console.log(`Found ${contests.length} open contests with tournaments in progress`);

    for (const contest of contests) {
      console.log(`Closing escrow deposits for ${contest.name}`);

      // Initialize escrow contract
      const wallet = getWallet();
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

      // Close deposits on blockchain. this sets the contract state to "IN_PROGRESS"
      const closeTx = await escrowContract.closeDeposits();
      console.log(`Close tx: ${closeTx.hash}`);
      await closeTx.wait();

      // Update contest status in database
      await prisma.contest.update({
        where: { id: contest.id },
        data: { status: 'IN_PROGRESS' },
      });

      console.log(`Closed escrow deposits for ${contest.name}`);
    }
  } catch (error) {
    console.error('Error closing escrow deposits:', error);
    throw error;
  }
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  closeEscrowDeposits()
    .then(() => {
      console.log('Escrow deposits closed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Escrow deposits close failed:', error);
      process.exit(1);
    });
}
