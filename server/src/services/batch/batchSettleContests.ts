/**
 * Batch settle contests (for cron jobs)
 * 
 * Finds all ACTIVE or LOCKED contests where the tournament is COMPLETED,
 * then settles each one.
 */

import { prisma } from '../../lib/prisma.js';
import { settleContest } from '../contest/settleContest.js';
import { type BatchOperationResult } from '../shared/types.js';

export async function batchSettleContests(): Promise<BatchOperationResult> {
  // console.log('[batchSettleContests] Starting batch settlement');

  try {
    // Find all ACTIVE or LOCKED contests where tournament is COMPLETED
    const contests = await prisma.contest.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'LOCKED'],
        },
        chainId: {
          in: [8453, 84532], // Base and Base Sepolia
        },
        tournament: {
          status: 'COMPLETED',
        },
      },
      select: {
        id: true,
        name: true,
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

    // Settle each contest sequentially to avoid nonce conflicts
    const results = [];
    for (const contest of contests) {
      const result = await settleContest(contest.id);
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
      total: contests.length,
      succeeded,
      failed,
      results,
    };
  } catch (error) {
    console.error('Error in batch operation:', error);
    throw error;
  }
}

// Main execution block (for direct script execution)
if (import.meta.url === `file://${process.argv[1]}`) {
  batchSettleContests()
    .then((result) => {
      console.log('Batch settle contests completed:', result);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Batch settle contests failed:', error);
      process.exit(1);
    });
}

