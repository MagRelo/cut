/**
 * Analyze decisive candidates for a PGA golf contest.
 *
 * Uses generic historical PGA hole outcomes to simulate plausible golfer and
 * lineup finishes through the production contest scoring path.
 *
 * Usage:
 *   pnpm --filter server run script:analyze-decisive-candidates <contestId>
 *   pnpm --filter server run script:analyze-decisive-candidates --event <eventId>
 *
 * Optional flags:
 *   --event <eventId>   analyze every contest on the event
 *   --simulations <n>   scenario count (default 2000, range 100–10000)
 *   --seed <n>          deterministic random seed (default 2026)
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
  computePickRates,
  readCurrentPeriod,
  type PopularityRules,
  type ScoringRules,
} from "@cut/sport-sdk";
import { prisma } from "../lib/prisma.js";
import { loadGenericGolfScoringModel } from "../sports/pga-golf/loadGenericScoringModel.js";
import { lineupPicksInclude } from "../utils/prismaIncludes.js";

function numericFlag(name: string, value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} requires a finite number`);
  }
  return parsed;
}

export function parseArgs(argv: string[]) {
  let contestId: string | undefined;
  let eventId: string | undefined;
  let simulations: number | undefined;
  let seed: number | undefined;
  let weight: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--event") {
      eventId = argv[++i];
      if (!eventId) throw new Error("--event requires an event id");
    } else if (arg === "--simulations") {
      simulations = numericFlag(arg, argv[++i]);
      if (simulations < 100 || simulations > 10_000) {
        throw new Error("--simulations must be between 100 and 10000");
      }
    } else if (arg === "--seed") {
      seed = numericFlag(arg, argv[++i]);
    } else if (arg === "--weight") {
      weight = numericFlag(arg, argv[++i]);
    } else if (!arg.startsWith("-") && !contestId) {
      contestId = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { contestId, eventId, simulations, seed, weight };
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
          user: { select: { name: true } },
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

  for (const cl of contest.contestLineups) {
    if (!cl.entryId) continue;
    const picks = cl.lineup.picks;
    entries.push({
      entryId: cl.entryId,
      displayName: cl.user.name,
      prediction: cl.lineup.prediction,
      createdAt: cl.createdAt,
      eventParticipantIds: picks.map((p) => p.eventParticipantId),
    });
  }

  const field = await prisma.eventParticipant.findMany({
    where: { eventId: contest.eventId },
    include: { participant: true },
  });
  const missingTotals: string[] = [];
  const participants: DecisiveCandidateParticipant[] = field.map((ep) => {
    if (ep.total == null) missingTotals.push(ep.id);
    return {
      eventParticipantId: ep.id,
      displayName: displayNameFromParticipant(
        ep.participant.metadata,
        ep.participant.displayName || ep.id,
      ),
      scoreData: ep.scoreData,
      total: ep.total ?? 0,
    };
  });
  const frozenRates = pickRatesFromPopularity(contest.pickPopularity);
  const computedRates =
    frozenRates == null
      ? computePickRates(entries.map((entry) => entry.eventParticipantIds))
      : null;

  return {
    contestId: contest.id,
    eventId: contest.eventId,
    currentPeriod: readCurrentPeriod(contest.event.metadata),
    entries,
    participants,
    popularity: popularity ?? null,
    pickRates:
      frozenRates ??
      (computedRates ? Object.fromEntries(computedRates.entries()) : null),
    pickRatesLocked: frozenRates != null,
    missingTotals,
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
  options: { simulations?: number; seed?: number; weight?: number },
) {
  const loaded = await loadContestInput(contestId, options.weight);
  const calibration = await loadGenericGolfScoringModel(loaded.eventId);
  const report = analyzeDecisiveCandidates({
    contestId: loaded.contestId,
    eventId: loaded.eventId,
    currentPeriod: loaded.currentPeriod,
    entries: loaded.entries,
    participants: loaded.participants,
    scoringModel: calibration.model,
    popularity: loaded.popularity,
    pickRates: loaded.pickRates,
    options: {
      simulations: options.simulations,
      seed: options.seed,
    },
  });
  const recomputedByEntry = new Map(
    report.lineupOutlooks.map((outlook) => [outlook.entryId, outlook.scoreNow]),
  );
  const scoreDrift = loaded.persistedScores
    .filter(
      (entry) =>
        entry.score != null &&
        recomputedByEntry.has(entry.entryId) &&
        recomputedByEntry.get(entry.entryId) !== entry.score,
    )
    .map((entry) => ({
      entryId: entry.entryId,
      persisted: entry.score,
      recomputed: recomputedByEntry.get(entry.entryId),
    }));
  const warnings: string[] = [];
  if (loaded.missingTotals.length > 0) {
    warnings.push(
      `${loaded.missingTotals.length} field participants have missing totals and were treated as 0.`,
    );
  }
  if (scoreDrift.length > 0) {
    warnings.push(
      `${scoreDrift.length} lineup scores differ from persisted live scores; the outlook used recomputed totals.`,
    );
  }

  return {
    meta: {
      eventExternalId: loaded.eventExternalId,
      contestStatus: loaded.contestStatus,
      entryCount: loaded.entries.length,
      fieldCount: loaded.participants.length,
      popularity: loaded.popularity ?? { weight: 0 },
      pickRatesLocked: loaded.pickRatesLocked,
      calibration: {
        eventParticipantCount: calibration.eventParticipantCount,
        holeSampleCount: calibration.holeSampleCount,
      },
      warnings,
      scoreDrift,
      persistedScores: loaded.persistedScores,
    },
    report,
  };
}

async function main(): Promise<void> {
  const { contestId, eventId, simulations, seed, weight } = parseArgs(
    process.argv.slice(2),
  );

  if (!contestId && !eventId) {
    console.error(
      "Usage: script:analyze-decisive-candidates <contestId> | --event <eventId> [--simulations n] [--seed n] [--weight n]",
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
    results.push(await analyzeOne(id, { simulations, seed, weight }));
  }

  console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
