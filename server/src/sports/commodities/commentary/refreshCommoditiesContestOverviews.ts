import {
  buildSessionDayCloseTimestamps,
  COMMODITIES_SPORT_ID,
  parseCommoditiesEventMetadata,
  resolveCommoditiesSessionBounds,
  resolveSettledPeriodFromScoreData,
} from "@cut/sport-commodities";
import { prisma } from "../../../lib/prisma.js";
import { generateContestCommentary } from "../../../services/contest/generateContestCommentary.js";
import type {
  BatchOperationResult,
  OperationResult,
} from "../../../services/shared/types.js";
import { requireSportModule } from "../../registry.js";
import { tryWithCommentaryLlmLock } from "../../../lib/commentaryLlmMutex.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function settledDayCloseAt(
  metadata: unknown,
  settledPeriod: number,
): Date | null {
  if (settledPeriod < 1) return null;
  const parsed = parseCommoditiesEventMetadata(metadata);
  if (!parsed) return null;
  const bounds = resolveCommoditiesSessionBounds({
    sessionDate: parsed.sessionDate,
    sessionOpen: parsed.sessionOpen,
    sessionClose: parsed.sessionClose,
  });
  const closes = buildSessionDayCloseTimestamps(bounds);
  const closeMs = closes[settledPeriod - 1];
  return closeMs != null ? new Date(closeMs) : null;
}

/**
 * True when a trading day has settled and overview commentary has not yet
 * been generated for that settled day (or is missing entirely).
 */
export function needsCommoditiesDayOverview(input: {
  settledPeriod: number;
  commentary: string | null;
  commentaryGeneratedAt: Date | null;
  settledDayClose: Date | null;
}): boolean {
  if (input.settledPeriod < 1) return false;
  if (!input.commentary?.trim() || input.commentaryGeneratedAt == null) {
    return true;
  }
  if (input.settledDayClose == null) {
    return true;
  }
  return input.commentaryGeneratedAt.getTime() < input.settledDayClose.getTime();
}

/**
 * Refresh Contest.commentary after each commodities trading day settles.
 * Uses the shared commentary LLM mutex; skips the pass if golf feed holds it.
 */
export async function refreshCommoditiesContestOverviews(
  now: Date = new Date(),
): Promise<BatchOperationResult> {
  void now;
  if (process.env.CONTEST_COMMENTARY_ENABLED !== "true") {
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }
  if (!process.env.CURSOR_API_KEY?.trim()) {
    console.warn(
      "[refreshCommoditiesContestOverviews] Skipped: CURSOR_API_KEY is not configured",
    );
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  const locked = await tryWithCommentaryLlmLock(async () => {
    const candidates = await prisma.contest.findMany({
      where: {
        status: { in: ["ACTIVE", "LOCKED", "SETTLED"] },
        event: {
          is: {
            sportId: COMMODITIES_SPORT_ID,
            isActive: true,
          },
        },
        contestLineups: {
          some: { entryId: { not: null } },
        },
      },
      select: {
        id: true,
        eventId: true,
        commentary: true,
        commentaryGeneratedAt: true,
        event: {
          select: {
            sportId: true,
            metadata: true,
          },
        },
      },
    });

    const results: OperationResult[] = [];
    for (const contest of candidates) {
      try {
        const sportModule = requireSportModule(contest.event.sportId);
        const eventStatus = await sportModule.getEventStatus(contest.eventId);
        if (eventStatus !== "LIVE" && eventStatus !== "COMPLETE") {
          continue;
        }

        const field = await prisma.eventParticipant.findMany({
          where: { eventId: contest.eventId },
          select: { scoreData: true },
        });
        const settledPeriod = resolveSettledPeriodFromScoreData(field);
        const settledDayClose = settledDayCloseAt(
          contest.event.metadata,
          settledPeriod,
        );
        if (
          !needsCommoditiesDayOverview({
            settledPeriod,
            commentary: contest.commentary,
            commentaryGeneratedAt: contest.commentaryGeneratedAt,
            settledDayClose,
          })
        ) {
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
          `[refreshCommoditiesContestOverviews] Contest ${contest.id} failed:`,
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
      "[refreshCommoditiesContestOverviews] Skipped: commentary LLM lock held",
    );
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  return locked;
}
