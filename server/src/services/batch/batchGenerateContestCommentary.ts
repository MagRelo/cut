import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";
import { generateContestCommentary } from "../contest/generateContestCommentary.js";
import type { BatchOperationResult, OperationResult } from "../shared/types.js";

export const CONTEST_COMMENTARY_REFRESH_MS = 20 * 60 * 1000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function batchGenerateContestCommentary(
  now: Date = new Date(),
): Promise<BatchOperationResult> {
  if (process.env.CONTEST_COMMENTARY_ENABLED !== "true") {
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }
  if (!process.env.CURSOR_API_KEY?.trim()) {
    console.warn("[batchGenerateContestCommentary] Skipped: CURSOR_API_KEY is not configured");
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  const refreshCutoff = new Date(now.getTime() - CONTEST_COMMENTARY_REFRESH_MS);
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
      OR: [{ commentaryGeneratedAt: null }, { commentaryGeneratedAt: { lte: refreshCutoff } }],
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
      console.error(`[batchGenerateContestCommentary] Contest ${contest.id} failed:`, error);
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
}
