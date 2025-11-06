/**
 * Batch close contests (for cron jobs)
 * 
 * Finds all SETTLED contests that have reached their expiry timestamp,
 * then closes each one (sweeping unclaimed funds to oracle).
 */

import { prisma } from '../../lib/prisma.js';
import { closeContest } from '../contest/closeContest.js';
import { getContestContract } from '../shared/contractClient.js';
import { type BatchOperationResult } from '../shared/types.js';

export async function batchCloseContests(): Promise<BatchOperationResult> {
  // console.log('[batchCloseContests] Starting batch close');

  try {
    // Find all SETTLED contests
    const contests = await prisma.contest.findMany({
      where: {
        status: 'SETTLED',
        chainId: {
          in: [8453, 84532], // Base and Base Sepolia
        },
      },
      select: {
        id: true,
        name: true,
        address: true,
        chainId: true,
      },
    });

    if (contests.length === 0) {
      return {
        total: 0,
        succeeded: 0,
        failed: 0,
        results: [],
      };
    }

    // Check expiry time for each contest
    const currentTime = Math.floor(Date.now() / 1000);
    const expiredContests = [];

    for (const contest of contests) {
      try {
        const contract = getContestContract(contest.address, contest.chainId);
        const expiryTimestamp = (await contract.read.expiryTimestamp!()) as bigint;

        if (currentTime >= Number(expiryTimestamp)) {
          expiredContests.push(contest);
        }
      } catch (error) {
        console.error(`[CRON] Error reading expiry for contest ${contest.id}:`, error);
      }
    }

    if (expiredContests.length === 0) {
      return {
        total: contests.length,
        succeeded: 0,
        failed: 0,
        results: [],
      };
    }

    // Close each expired contest sequentially to avoid nonce conflicts
    const results = [];
    for (const contest of expiredContests) {
      const result = await closeContest(contest.id);
      results.push(result);
      
      // Add a small delay between transactions to ensure nonce propagation
      if (result.success) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Count successes and failures
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: expiredContests.length,
      succeeded,
      failed,
      results,
    };
  } catch (error) {
    console.error('[batchCloseContests] Error in batch operation:', error);
    throw error;
  }
}

// Main execution block (for direct script execution)
if (import.meta.url === `file://${process.argv[1]}`) {
  batchCloseContests()
    .then((result) => {
      console.log('Batch close contests completed:', result);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Batch close contests failed:', error);
      process.exit(1);
    });
}

