import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { prisma } from "../../../lib/prisma.js";
import { generateContestCommentary } from "../../../services/contest/generateContestCommentary.js";
import type {
  BatchOperationResult,
  OperationResult,
} from "../../../services/shared/types.js";
import { requireSportModule } from "../../registry.js";
import { tryWithCommentaryLlmLock } from "./llmMutex.js";

export const CONTEST_COMMENTARY_OVERVIEW_REFRESH_MS = 20 * 60 * 1000;

/** @deprecated Use CONTEST_COMMENTARY_OVERVIEW_REFRESH_MS */
export const CONTEST_COMMENTARY_REFRESH_MS = CONTEST_COMMENTARY_OVERVIEW_REFRESH_MS;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Refresh legacy Contest.commentary snapshots (no feed work).
 * Uses LLM mutex; skips the whole pass if the feed worker holds the lock.
 */
export async function refreshContestOverviews(
  now: Date = new Date(),
): Promise<BatchOperationResult> {
  if (process.env.CONTEST_COMMENTARY_ENABLED !== "true") {
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }
  if (!process.env.CURSOR_API_KEY?.trim()) {
    console.warn(
      "[refreshContestOverviews] Skipped: CURSOR_API_KEY is not configured",
    );
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  const locked = await tryWithCommentaryLlmLock(async () => {
    const refreshCutoff = new Date(
      now.getTime() - CONTEST_COMMENTARY_OVERVIEW_REFRESH_MS,
    );
    const candidates = await prisma.contest.findMany({
      where: {
        status: { in: ["ACTIVE", "LOCKED"] },
        event: {
          is: {
            sportId: PGA_GOLF_SPORT_ID,
            isActive: true,
          },
        },
        contestLineups: {
          some: { entryId: { not: null } },
        },
        OR: [
          { commentaryGeneratedAt: null },
          { commentaryGeneratedAt: { lte: refreshCutoff } },
        ],
      },
      select: {
        id: true,
        eventId: true,
        event: {
          select: { sportId: true },
        },
      },
    });

    const results: OperationResult[] = [];
    for (const contest of candidates) {
      try {
        const sportModule = requireSportModule(contest.event.sportId);
        const eventStatus = await sportModule.getEventStatus(contest.eventId);
        if (eventStatus !== "LIVE") {
          continue;
        }

        const generated = await generateContestCommentary(contest.id);
        await prisma.contest.update({
          where: { id: contest.id },
          data: {
            commentary: generated.commentary,
            commentaryGeneratedAt: new Date(generated.generatedAt),
          },
        });
        results.push({ success: true, contestId: contest.id });
      } catch (error) {
        const message = errorMessage(error);
        console.error(
          `[refreshContestOverviews] Contest ${contest.id} failed:`,
          error,
        );
        results.push({ success: false, contestId: contest.id, error: message });
      }
    }

    const succeeded = results.filter((result) => result.success).length;
    return {
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  });

  if (locked == null) {
    console.log(
      "[refreshContestOverviews] Skipped: commentary LLM lock held by feed worker",
    );
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  return locked;
}
