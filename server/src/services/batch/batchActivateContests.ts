/**
 * Batch activate contests (for cron jobs)
 *
 * Finds OPEN contests whose event is ready for activation via the sport plugin.
 */

import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";
import { activateContest } from "../contest/activateContest.js";
import { type BatchOperationResult } from "../shared/types.js";

export async function batchActivateContests(): Promise<BatchOperationResult> {
  try {
    const openContests = await prisma.contest.findMany({
      where: {
        status: "OPEN",
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
    for (const contest of openContests) {
      const sportModule = requireSportModule(contest.event.sportId);
      const eventStatus = await sportModule.getEventStatus(contest.eventId);
      if (sportModule.shouldActivateContest(eventStatus)) {
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
      const result = await activateContest(contest.id);
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
    console.error("[batchActivateContests] Error in batch operation:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  batchActivateContests()
    .then((result) => {
      console.log("Batch activate contests completed:", result);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Batch activate contests failed:", error);
      process.exit(1);
    });
}
