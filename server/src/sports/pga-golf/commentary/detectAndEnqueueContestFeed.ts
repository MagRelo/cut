import {
  buildContestFeedFactPack,
  buildContestFeedHoleState,
  classifyContestFeedStories,
  golfPeriodInProgress,
  mergeContestFeedItems,
  parseContestCommentaryFeedDocument,
  PGA_GOLF_SPORT_ID,
} from "@cut/sport-pga-golf";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { buildContestCommentaryContext } from "./buildContestCommentaryContext.js";
import { requireSportModule } from "../../registry.js";
import { enqueueCommentaryFeedJob } from "./commentaryFeedJobs.js";

function commentaryConfigured(): boolean {
  return (
    process.env.CONTEST_COMMENTARY_ENABLED === "true" &&
    Boolean(process.env.CURSOR_API_KEY?.trim())
  );
}

/**
 * After live score sync: classify feed stories and enqueue LLM jobs.
 * Advances lastHoleState / lastContext fingerprints immediately (no Cursor).
 */
export async function detectAndEnqueueContestFeed(eventId: string): Promise<void> {
  if (!commentaryConfigured()) {
    return;
  }

  const contests = await prisma.contest.findMany({
    where: {
      eventId,
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
    },
    select: {
      id: true,
      commentaryFeed: true,
    },
  });

  if (contests.length === 0) {
    return;
  }

  const sportModule = requireSportModule(PGA_GOLF_SPORT_ID);
  const eventStatus = await sportModule.getEventStatus(eventId);
  if (eventStatus !== "LIVE") {
    return;
  }

  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    select: { metadata: true },
  });
  const periodInProgress = golfPeriodInProgress(event?.metadata);

  for (const contest of contests) {
    try {
      const built = await buildContestCommentaryContext(contest.id);
      const existing = parseContestCommentaryFeedDocument(contest.commentaryFeed);
      const now = new Date();
      const generatedAt = now.toISOString();
      const nowMs = now.getTime();
      const contestPlayers = built.contestPlayers ?? [];
      const previousHoleState = existing.lastHoleState ?? null;

      const candidates = classifyContestFeedStories(
        existing.lastContext,
        built.context,
        {
          existingItems: existing.items,
          nowMs,
          contestPlayers,
          previousHoleState,
          periodInProgress,
        },
      );

      const advanced = mergeContestFeedItems(existing, [], {
        updatedAt: generatedAt,
        lastContext: built.context,
        lastHoleState: buildContestFeedHoleState(contestPlayers),
      });

      await prisma.contest.update({
        where: { id: contest.id },
        data: {
          commentaryFeed: advanced as unknown as Prisma.InputJsonValue,
        },
      });

      if (candidates.length === 0) {
        console.log(
          `[detectAndEnqueueContestFeed] ${contest.id}: 0 candidates`,
        );
        continue;
      }

      const stories = candidates.map((candidate) => ({
        candidate,
        factPack: buildContestFeedFactPack(
          candidate,
          built.context,
          existing.lastContext,
          { contestPlayers, previousHoleState },
        ),
      }));

      const job = await enqueueCommentaryFeedJob({
        contestId: contest.id,
        payload: {
          schemaVersion: 1,
          period:
            typeof built.context.period === "number" ? built.context.period : null,
          stories,
        },
      });

      const types = candidates.map((c) => c.storyType).join(",");
      if (job) {
        console.log(
          `[detectAndEnqueueContestFeed] ${contest.id}: enqueued ${candidates.length}: ${types}`,
        );
      } else {
        console.log(
          `[detectAndEnqueueContestFeed] ${contest.id}: ${candidates.length} candidates but enqueue skipped (${types})`,
        );
      }
    } catch (error) {
      console.error(
        `[detectAndEnqueueContestFeed] Contest ${contest.id} failed:`,
        error,
      );
    }
  }
}
