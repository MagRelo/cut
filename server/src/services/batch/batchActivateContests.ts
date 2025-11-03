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
  console.log('[batchActivateContests] Starting batch activation');

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

    console.log(`[batchActivateContests] Found ${contests.length} contests to activate`);

    if (contests.length === 0) {
      return {
        total: 0,
        succeeded: 0,
        failed: 0,
        results: [],
      };
    }

    // Activate each contest
    const results = await Promise.all(
      contests.map((contest) => {
        console.log(`[batchActivateContests] Activating contest ${contest.id}: ${contest.name}`);
        return activateContest(contest.id);
      })
    );

    // Count successes and failures
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[batchActivateContests] Complete: ${succeeded} succeeded, ${failed} failed`);

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

