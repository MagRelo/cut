/**
 * Batch settle contests (for cron jobs)
 *
 * Finds ACTIVE or LOCKED contests whose event is complete per the sport plugin.
 */

import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";
import { settleContest } from "../contest/settleContest.js";
import { type BatchOperationResult } from "../shared/types.js";

export async function batchSettleContests(): Promise<BatchOperationResult> {
  try {
    const activeContests = await prisma.contest.findMany({
      where: {
        status: {
          in: ["ACTIVE", "LOCKED"],
        },
        chainId: {
          in: [8453, 84532],
        },
      },
      select: {
        id: true,
        name: true,
        chainId: true,
        eventId: true,
        event: {
          select: { sportId: true },
        },
      },
    });

    const contests = [];
    for (const contest of activeContests) {
      const sportModule = requireSportModule(contest.event.sportId);
      const eventStatus = await sportModule.getEventStatus(contest.eventId);
      if (sportModule.shouldSettleContest(eventStatus)) {
        contests.push(contest);
      }
    }

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
      const result = await settleContest(contest.id);
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
    console.error("Error in batch operation:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  batchSettleContests()
    .then((result) => {
      console.log("Batch settle contests completed:", result);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Batch settle contests failed:", error);
      process.exit(1);
    });
}
