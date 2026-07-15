/**
 * Analyze decisive candidates for a PGA golf contest.
 *
 * Scores are recomputed from live EventParticipant.total values, then run
 * through ScoringRules.popularity (same path as contest scoring). Remaining
 * Stableford sweeps add R to that pick’s external total and re-score.
 *
 * Usage:
 *   pnpm --filter server run script:analyze-decisive-candidates <contestId>
 *   pnpm --filter server run script:analyze-decisive-candidates --event <eventId>
 *
 * Optional flags:
 *   --event <eventId>   analyze every contest on the event
 *   --slack <n>         override contention slack
 *   --max-pts <n>       max stableford pts per remaining hole (default 4)
 *   --weight <n>        override sport popularity.weight for this run
 */

import "dotenv/config";
import {
  analyzeDecisiveCandidates,
  PGA_GOLF_SPORT_ID,
  type DecisiveCandidateEntry,
  type DecisiveCandidateParticipant,
} from "@cut/sport-pga-golf";
import {
  readCurrentPeriod,
  type PopularityRules,
  type ScoringRules,
} from "@cut/sport-sdk";
import { prisma } from "../lib/prisma.js";
import { lineupPicksInclude } from "../utils/prismaIncludes.js";

function parseArgs(argv: string[]) {
  let contestId: string | undefined;
  let eventId: string | undefined;
  let slack: number | undefined;
  let maxPts: number | undefined;
  let weight: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--event") {
      eventId = argv[++i];
    } else if (arg === "--slack") {
      slack = Number(argv[++i]);
    } else if (arg === "--max-pts") {
      maxPts = Number(argv[++i]);
    } else if (arg === "--weight") {
      weight = Number(argv[++i]);
    } else if (!arg.startsWith("-") && !contestId) {
      contestId = arg;
    }
  }

  return { contestId, eventId, slack, maxPts, weight };
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

function parseScoringRules(raw: unknown): ScoringRules {
  if (typeof raw !== "object" || raw === null) {
    return { aggregation: "sum", direction: "higher_wins" };
  }
  const obj = raw as Partial<ScoringRules>;
  const rules: ScoringRules = {
    aggregation: "sum",
    direction: obj.direction === "lower_wins" ? "lower_wins" : "higher_wins",
  };
  if (obj.popularity != null) {
    rules.popularity = obj.popularity;
  }
  return rules;
}

function pickRatesFromPopularity(raw: unknown): Record<string, number> | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const rates: Record<string, number> = {};
  for (const [epId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null) continue;
    const pickRate = (entry as { pickRate?: unknown }).pickRate;
    if (typeof pickRate === "number") {
      rates[epId] = pickRate;
    }
  }
  return Object.keys(rates).length > 0 ? rates : null;
}

async function loadContestInput(contestId: string, weightOverride?: number) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      event: {
        include: { sport: { select: { scoringRules: true } } },
      },
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

  const scoringRules = parseScoringRules(contest.event.sport.scoringRules);
  let popularity: PopularityRules | null | undefined = scoringRules.popularity;
  if (weightOverride != null && Number.isFinite(weightOverride)) {
    popularity = {
      ...(popularity ?? { weight: 0 }),
      weight: weightOverride,
    };
  }

  const entries: DecisiveCandidateEntry[] = [];
  const participants = new Map<string, DecisiveCandidateParticipant>();

  for (const cl of contest.contestLineups) {
    if (!cl.entryId) continue;
    const picks = cl.lineup.picks;
    entries.push({
      entryId: cl.entryId,
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
        total: ep.total ?? 0,
      });
    }
  }

  return {
    contestId: contest.id,
    eventId: contest.eventId,
    currentPeriod: readCurrentPeriod(contest.event.metadata),
    entries,
    participants: [...participants.values()],
    popularity: popularity ?? null,
    pickRates: pickRatesFromPopularity(contest.pickPopularity),
    eventExternalId: contest.event.externalId,
    contestStatus: contest.status,
    persistedScores: contest.contestLineups
      .filter((cl) => cl.entryId)
      .map((cl) => ({
        entryId: cl.entryId!,
        score: cl.score,
        baseScore: cl.baseScore,
        popularityBonus: cl.popularityBonus,
      })),
  };
}

async function analyzeOne(
  contestId: string,
  options: { slack?: number; maxPts?: number; weight?: number },
) {
  const loaded = await loadContestInput(contestId, options.weight);
  const report = analyzeDecisiveCandidates({
    contestId: loaded.contestId,
    eventId: loaded.eventId,
    currentPeriod: loaded.currentPeriod,
    entries: loaded.entries,
    participants: loaded.participants,
    popularity: loaded.popularity,
    pickRates: loaded.pickRates,
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
      popularity: loaded.popularity ?? { weight: 0 },
      pickRatesLocked: loaded.pickRates != null,
      persistedScores: loaded.persistedScores,
    },
    report,
  };
}

async function main(): Promise<void> {
  const { contestId, eventId, slack, maxPts, weight } = parseArgs(
    process.argv.slice(2),
  );

  if (!contestId && !eventId) {
    console.error(
      "Usage: script:analyze-decisive-candidates <contestId> | --event <eventId> [--slack n] [--max-pts n] [--weight n]",
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
    results.push(await analyzeOne(id, { slack, maxPts, weight }));
  }

  console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
