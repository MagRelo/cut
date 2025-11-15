/**
 * Batch lock contests (for cron jobs)
 *
 * Finds all ACTIVE contests where the tournament has reached round 4,
 * then locks each one.
 */

import { prisma } from "../../lib/prisma.js";
import { lockContest } from "../contest/lockContest.js";
import { type BatchOperationResult } from "../shared/types.js";

export async function batchLockContests(): Promise<BatchOperationResult> {
  try {
    const contests = await prisma.contest.findMany({
      where: {
        status: "ACTIVE",
        chainId: {
          in: [8453, 84532],
        },
        tournament: {
          currentRound: 4,
          status: {
            in: ["IN_PROGRESS", "COMPLETED"],
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

    const results = [];
    for (const contest of contests) {
      const result = await lockContest(contest.id);
      results.push(result);

      if (result.success) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: contests.length,
      succeeded,
      failed,
      results,
    };
  } catch (error) {
    console.error("[batchLockContests] Error in batch operation:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  batchLockContests()
    .then((result) => {
      console.log("Batch lock contests completed:", result);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Batch lock contests failed:", error);
      process.exit(1);
    });
}
