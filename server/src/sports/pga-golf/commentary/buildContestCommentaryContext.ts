import {
  analyzeContestCommentary,
  PGA_GOLF_SPORT_ID,
  scoreLineupFromTotals,
  type ContestCommentaryContext,
  type ContestCommentaryEntry,
  type ContestCommentaryParticipant,
  type ContestFeedContestPlayer,
} from "@cut/sport-pga-golf";
import {
  computePickRates,
  defaultPayoutVector,
  readCurrentPeriod,
  type PopularityRules,
  type ScoringRules,
} from "@cut/sport-sdk";
import { prisma } from "../../../lib/prisma.js";
import { loadGenericGolfScoringModel } from "../loadGenericScoringModel.js";
import { lineupPicksInclude } from "../../../utils/prismaIncludes.js";
import type { ContestCommentaryDiagnostics } from "../../../services/contest/commentaryDiagnostics.js";

export type { ContestCommentaryDiagnostics };

export interface BuildContestCommentaryContextOptions {
  simulations?: number;
  seed?: number;
  popularityWeight?: number;
}

export interface BuiltContestCommentaryContext {
  context: ContestCommentaryContext;
  diagnostics: ContestCommentaryDiagnostics;
  /** Contest-owned golfers with scorecards for event-first feed stories. */
  contestPlayers: ContestFeedContestPlayer[];
}

function displayNameFromParticipant(metadata: unknown, fallback: string): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const value = metadata as Record<string, unknown>;
    if (typeof value.displayName === "string" && value.displayName.trim()) {
      return value.displayName.trim();
    }
    const first = typeof value.firstName === "string" ? value.firstName : "";
    const last = typeof value.lastName === "string" ? value.lastName : "";
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
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

function buildContestFeedPlayers(
  entries: ContestCommentaryEntry[],
  participants: ContestCommentaryParticipant[],
): ContestFeedContestPlayer[] {
  const byId = new Map(
    participants.map((participant) => [
      participant.eventParticipantId,
      participant,
    ]),
  );
  const owners = new Map<
    string,
    { entryIds: string[]; names: string[] }
  >();
  for (const entry of entries) {
    for (const participantId of new Set(entry.eventParticipantIds)) {
      const row = owners.get(participantId) ?? { entryIds: [], names: [] };
      row.entryIds.push(entry.entryId);
      if (entry.displayName?.trim()) row.names.push(entry.displayName.trim());
      owners.set(participantId, row);
    }
  }
  const players: ContestFeedContestPlayer[] = [];
  for (const [participantId, ownership] of owners) {
    const participant = byId.get(participantId);
    if (!participant) continue;
    players.push({
      eventParticipantId: participantId,
      displayName: participant.displayName,
      scoreData: participant.scoreData,
      ownerEntryIds: ownership.entryIds,
      ownerNames: ownership.names,
    });
  }
  return players;
}

export async function buildContestCommentaryContext(
  contestId: string,
  options: BuildContestCommentaryContextOptions = {},
): Promise<BuiltContestCommentaryContext> {
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
  if (contest.event.sportId !== PGA_GOLF_SPORT_ID) {
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

  const entries: ContestCommentaryEntry[] = contest.contestLineups
    .filter((lineup) => Boolean(lineup.entryId))
    .map((lineup) => ({
      entryId: lineup.entryId!,
      displayName: lineup.user.name,
      prediction: lineup.lineup.prediction,
      createdAt: lineup.createdAt,
      eventParticipantIds: lineup.lineup.picks.map(
        (pick) => pick.eventParticipantId,
      ),
    }));
  if (entries.length === 0) {
    throw new Error(`Contest ${contestId} has no entered lineups`);
  }

  const field = await prisma.eventParticipant.findMany({
    where: { eventId: contest.eventId },
    include: { participant: true },
  });
  const missingTotals: string[] = [];
  const participants: ContestCommentaryParticipant[] = field.map((participant) => {
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
  });
  const frozenRates = pickRatesFromPopularity(contest.pickPopularity);
  const computedRates =
    frozenRates == null
      ? computePickRates(entries.map((entry) => entry.eventParticipantIds))
      : null;
  const pickRates =
    frozenRates ??
    (computedRates ? Object.fromEntries(computedRates.entries()) : null);
  const calibration = await loadGenericGolfScoringModel(contest.eventId);
  const paidCount = defaultPayoutVector(entries.length).filter(
    (amount) => amount > 0,
  ).length;

  const context = analyzeContestCommentary({
    contestId: contest.id,
    eventId: contest.eventId,
    currentPeriod: readCurrentPeriod(contest.event.metadata),
    paidCount,
    entries,
    participants,
    scoringModel: calibration.model,
    popularity: popularity ?? null,
    pickRates,
    options: {
      ...(options.simulations != null
        ? { simulations: options.simulations }
        : {}),
      ...(options.seed != null ? { seed: options.seed } : {}),
    },
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
    contestPlayers: buildContestFeedPlayers(entries, participants),
    diagnostics: {
      eventExternalId: contest.event.externalId,
      contestStatus: contest.status,
      entryCount: entries.length,
      fieldCount: participants.length,
      pickRatesLocked: frozenRates != null,
      calibration: {
        eventParticipantCount: calibration.eventParticipantCount,
        holeSampleCount: calibration.holeSampleCount,
      },
      warnings,
      scoreDrift,
    },
  };
}
