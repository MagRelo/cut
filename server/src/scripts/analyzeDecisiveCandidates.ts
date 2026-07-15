/**
 * Analyze decisive candidates for a PGA golf contest.
 *
 * Usage:
 *   pnpm --filter server run script:analyze-decisive-candidates <contestId>
 *   pnpm --filter server run script:analyze-decisive-candidates --event <eventId>
 *
 * Optional flags (no `--` separator for pnpm script args at repo root — run via filter):
 *   --event <eventId>   analyze every contest on the event
 *   --slack <n>         override contention slack
 *   --max-pts <n>       max stableford pts per remaining hole (default 4)
 */

import "dotenv/config";
import {
  analyzeDecisiveCandidates,
  PGA_GOLF_SPORT_ID,
  type DecisiveCandidateEntry,
  type DecisiveCandidateParticipant,
} from "@cut/sport-pga-golf";
import { readCurrentPeriod } from "@cut/sport-sdk";
import { prisma } from "../lib/prisma.js";
import { lineupPicksInclude } from "../utils/prismaIncludes.js";

function parseArgs(argv: string[]) {
  let contestId: string | undefined;
  let eventId: string | undefined;
  let slack: number | undefined;
  let maxPts: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--event") {
      eventId = argv[++i];
    } else if (arg === "--slack") {
      slack = Number(argv[++i]);
    } else if (arg === "--max-pts") {
      maxPts = Number(argv[++i]);
    } else if (!arg.startsWith("-") && !contestId) {
      contestId = arg;
    }
  }

  return { contestId, eventId, slack, maxPts };
}

function displayNameFromParticipant(metadata: unknown, fallback: string): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const m = metadata as Record<string, unknown>;
    if (typeof m.displayName === "string" && m.displayName.trim()) {
      return m.displayName.trim();
    }
    const first = typeof m.firstName === "string" ? m.firstName : "";
    const last = typeof m.lastName === "string" ? m.lastName : "";
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
  }
  return fallback;
}

async function loadContestInput(contestId: string) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      event: true,
      contestLineups: {
        include: {
          lineup: {
            include: lineupPicksInclude,
          },
        },
      },
    },
  });

  if (!contest) {
    throw new Error(`Contest not found: ${contestId}`);
  }
  if (contest.event.sportId !== PGA_GOLF_SPORT_ID) {
    throw new Error(
      `Contest ${contestId} is sport=${contest.event.sportId}; this script is golf-only`,
    );
  }

  const entries: DecisiveCandidateEntry[] = [];
  const participants = new Map<string, DecisiveCandidateParticipant>();

  for (const cl of contest.contestLineups) {
    if (!cl.entryId) continue;
    const picks = cl.lineup.picks;
    entries.push({
      entryId: cl.entryId,
      score: cl.score ?? 0,
      prediction: cl.lineup.prediction,
      createdAt: cl.createdAt,
      eventParticipantIds: picks.map((p) => p.eventParticipantId),
    });

    for (const pick of picks) {
      const ep = pick.eventParticipant;
      if (participants.has(ep.id)) continue;
      participants.set(ep.id, {
        eventParticipantId: ep.id,
        displayName: displayNameFromParticipant(
          ep.participant.metadata,
          ep.participant.displayName || ep.id,
        ),
        scoreData: ep.scoreData,
      });
    }
  }

  return {
    contestId: contest.id,
    eventId: contest.eventId,
    currentPeriod: readCurrentPeriod(contest.event.metadata),
    entries,
    participants: [...participants.values()],
    eventExternalId: contest.event.externalId,
    contestStatus: contest.status,
  };
}

async function analyzeOne(
  contestId: string,
  options: { slack?: number; maxPts?: number },
) {
  const loaded = await loadContestInput(contestId);
  const report = analyzeDecisiveCandidates({
    contestId: loaded.contestId,
    eventId: loaded.eventId,
    currentPeriod: loaded.currentPeriod,
    entries: loaded.entries,
    participants: loaded.participants,
    options: {
      slackOverride: options.slack,
      maxPtsPerHole: options.maxPts,
    },
  });

  return {
    meta: {
      eventExternalId: loaded.eventExternalId,
      contestStatus: loaded.contestStatus,
      entryCount: loaded.entries.length,
    },
    report,
  };
}

async function main(): Promise<void> {
  const { contestId, eventId, slack, maxPts } = parseArgs(process.argv.slice(2));

  if (!contestId && !eventId) {
    console.error(
      "Usage: script:analyze-decisive-candidates <contestId> | --event <eventId> [--slack n] [--max-pts n]",
    );
    process.exit(1);
  }

  const contestIds: string[] = [];
  if (contestId) {
    contestIds.push(contestId);
  } else if (eventId) {
    const contests = await prisma.contest.findMany({
      where: { eventId },
      select: { id: true, status: true },
      orderBy: { createdAt: "asc" },
    });
    if (contests.length === 0) {
      throw new Error(`No contests for event ${eventId}`);
    }
    contestIds.push(...contests.map((c) => c.id));
  }

  const results = [];
  for (const id of contestIds) {
    results.push(await analyzeOne(id, { slack, maxPts }));
  }

  console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
