import {
  analyzeCommoditiesContestCommentary,
  COMMODITIES_SPORT_ID,
  type CommoditiesContestCommentaryContext,
  type CommoditiesContestCommentaryEntry,
  type CommoditiesContestCommentaryParticipant,
} from "@cut/sport-commodities";
import {
  adjustPickScore,
  computePickRates,
  defaultPayoutVector,
  normalizePopularityRules,
  readCurrentPeriod,
  type PopularityRules,
  type ScoringRules,
} from "@cut/sport-sdk";
import { prisma } from "../../../lib/prisma.js";
import { lineupPicksInclude } from "../../../utils/prismaIncludes.js";
import { commentaryOwnerDisplayName } from "../../../services/contest/commentaryOwnerDisplayName.js";
import type { ContestCommentaryDiagnostics } from "../../../services/contest/commentaryDiagnostics.js";

export interface BuildCommoditiesContestCommentaryContextOptions {
  popularityWeight?: number;
}

export interface BuiltCommoditiesContestCommentaryContext {
  context: CommoditiesContestCommentaryContext;
  diagnostics: ContestCommentaryDiagnostics;
}

function displayNameFromParticipant(metadata: unknown, fallback: string): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const value = metadata as Record<string, unknown>;
    if (typeof value.displayName === "string" && value.displayName.trim()) {
      return value.displayName.trim();
    }
  }
  return fallback;
}

function parseScoringRules(raw: unknown): ScoringRules {
  if (typeof raw !== "object" || raw === null) {
    return { aggregation: "sum", direction: "higher_wins" };
  }
  const value = raw as Partial<ScoringRules>;
  return {
    aggregation: "sum",
    direction: value.direction === "lower_wins" ? "lower_wins" : "higher_wins",
    ...(value.popularity != null ? { popularity: value.popularity } : {}),
  };
}

function pickRatesFromPopularity(raw: unknown): Record<string, number> | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const rates: Record<string, number> = {};
  for (const [participantId, entry] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (typeof entry !== "object" || entry === null) continue;
    const pickRate = (entry as { pickRate?: unknown }).pickRate;
    if (typeof pickRate === "number") rates[participantId] = pickRate;
  }
  return Object.keys(rates).length > 0 ? rates : null;
}

function scoreLineupFromTotals(
  eventParticipantIds: readonly string[],
  totalsById: Map<string, number>,
  pickRates: Record<string, number> | null | undefined,
  popularity: PopularityRules | null | undefined,
): number {
  const rules = normalizePopularityRules(popularity);
  return eventParticipantIds.reduce((sum, eventParticipantId) => {
    const total = totalsById.get(eventParticipantId) ?? 0;
    const pickRate = pickRates?.[eventParticipantId] ?? 0;
    return sum + adjustPickScore(total, pickRate, rules).adjustedScore;
  }, 0);
}

export async function buildCommoditiesContestCommentaryContext(
  contestId: string,
  options: BuildCommoditiesContestCommentaryContextOptions = {},
): Promise<BuiltCommoditiesContestCommentaryContext> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      event: {
        include: { sport: { select: { scoringRules: true } } },
      },
      contestLineups: {
        include: {
          user: { select: { name: true } },
          lineup: { include: lineupPicksInclude },
        },
      },
    },
  });
  if (!contest) throw new Error(`Contest not found: ${contestId}`);
  if (contest.event.sportId !== COMMODITIES_SPORT_ID) {
    throw new Error(
      `Contest ${contestId} uses unsupported sport ${contest.event.sportId}`,
    );
  }

  const scoringRules = parseScoringRules(contest.event.sport.scoringRules);
  let popularity: PopularityRules | null | undefined = scoringRules.popularity;
  if (options.popularityWeight != null) {
    if (!Number.isFinite(options.popularityWeight)) {
      throw new Error("popularityWeight must be finite");
    }
    popularity = {
      ...(popularity ?? { weight: 0 }),
      weight: options.popularityWeight,
    };
  }

  const enteredLineups = contest.contestLineups.filter((lineup) =>
    Boolean(lineup.entryId),
  );
  const entryCountByUserId = new Map<string, number>();
  for (const lineup of enteredLineups) {
    entryCountByUserId.set(
      lineup.userId,
      (entryCountByUserId.get(lineup.userId) ?? 0) + 1,
    );
  }

  const entries: CommoditiesContestCommentaryEntry[] = enteredLineups.map(
    (lineup) => ({
      entryId: lineup.entryId!,
      displayName: commentaryOwnerDisplayName({
        userName: lineup.user.name,
        lineupName: lineup.lineup.name,
        userEntryCount: entryCountByUserId.get(lineup.userId) ?? 1,
      }),
      prediction: lineup.lineup.prediction,
      createdAt: lineup.createdAt,
      eventParticipantIds: lineup.lineup.picks.map(
        (pick) => pick.eventParticipantId,
      ),
    }),
  );
  if (entries.length === 0) {
    throw new Error(`Contest ${contestId} has no entered lineups`);
  }

  const field = await prisma.eventParticipant.findMany({
    where: { eventId: contest.eventId },
    include: { participant: true },
  });
  const missingTotals: string[] = [];
  const participants: CommoditiesContestCommentaryParticipant[] = field.map(
    (participant) => {
      if (participant.total == null) missingTotals.push(participant.id);
      return {
        eventParticipantId: participant.id,
        displayName: displayNameFromParticipant(
          participant.participant.metadata,
          participant.participant.displayName || participant.id,
        ),
        scoreData: participant.scoreData,
        total: participant.total ?? 0,
      };
    },
  );

  const frozenRates = pickRatesFromPopularity(contest.pickPopularity);
  const computedRates =
    frozenRates == null
      ? computePickRates(entries.map((entry) => entry.eventParticipantIds))
      : null;
  const pickRates =
    frozenRates ??
    (computedRates ? Object.fromEntries(computedRates.entries()) : null);
  const paidCount = defaultPayoutVector(entries.length).filter(
    (amount) => amount > 0,
  ).length;

  const context = analyzeCommoditiesContestCommentary({
    contestId: contest.id,
    eventId: contest.eventId,
    externalId: contest.event.externalId,
    currentPeriod: readCurrentPeriod(contest.event.metadata),
    paidCount,
    entries,
    participants,
    popularity: popularity ?? null,
    pickRates,
  });

  const totalsById = new Map(
    participants.map((participant) => [
      participant.eventParticipantId,
      participant.total,
    ]),
  );
  const recomputedByEntry = new Map(
    entries.map((entry) => [
      entry.entryId,
      scoreLineupFromTotals(
        entry.eventParticipantIds,
        totalsById,
        pickRates,
        popularity,
      ),
    ]),
  );
  const scoreDrift = contest.contestLineups.flatMap((lineup) => {
    if (!lineup.entryId || lineup.score == null) return [];
    const recomputed = recomputedByEntry.get(lineup.entryId);
    if (recomputed == null || recomputed === lineup.score) return [];
    return [{ entryId: lineup.entryId, persisted: lineup.score, recomputed }];
  });
  const warnings: string[] = [];
  if (missingTotals.length > 0) {
    warnings.push(
      `${missingTotals.length} field participants have missing totals and were treated as 0.`,
    );
  }
  if (scoreDrift.length > 0) {
    warnings.push(
      `${scoreDrift.length} lineup scores differ from persisted live scores; analysis used recomputed totals.`,
    );
  }

  return {
    context,
    diagnostics: {
      eventExternalId: contest.event.externalId,
      contestStatus: contest.status,
      entryCount: entries.length,
      fieldCount: participants.length,
      pickRatesLocked: frozenRates != null,
      calibration: {
        eventParticipantCount: 0,
        holeSampleCount: 0,
      },
      warnings,
      scoreDrift,
    },
  };
}
