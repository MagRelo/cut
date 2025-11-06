/**
 * Batch activate contests (for cron jobs)
 * 
 * Finds all OPEN contests where the tournament has started,
 * then activates each one.
 */

import { prisma } from '../../lib/prisma.js';
import { activateContest } from '../contest/activateContest.js';
import { type BatchOperationResult } from '../shared/types.js';

export async function batchActivateContests(): Promise<BatchOperationResult> {
  // console.log('[batchActivateContests] Starting batch activation');

  try {
    // Find all OPEN contests where tournament is IN_PROGRESS or COMPLETED
    const contests = await prisma.contest.findMany({
      where: {
        status: 'OPEN',
        chainId: {
          in: [8453, 84532], // Base and Base Sepolia
        },
        tournament: {
          status: {
            in: ['IN_PROGRESS', 'COMPLETED'],
          },
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

    // Activate each contest sequentially to avoid nonce conflicts
    const results = [];
    for (const contest of contests) {
      const result = await activateContest(contest.id);
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
    console.error('[batchActivateContests] Error in batch operation:', error);
    throw error;
  }
}

// Main execution block (for direct script execution)
if (import.meta.url === `file://${process.argv[1]}`) {
  batchActivateContests()
    .then((result) => {
      console.log('Batch activate contests completed:', result);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Batch activate contests failed:', error);
      process.exit(1);
    });
}

