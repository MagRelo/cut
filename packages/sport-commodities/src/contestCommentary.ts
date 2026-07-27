import {
  adjustPickScore,
  normalizePopularityRules,
  parseLineupPrediction,
  type PopularityRules,
} from "@cut/sport-sdk";
import { COMMODITIES_PERIOD_RULES } from "./periods.js";
import type { CommodityRoundScoreData, CommodityScoreData } from "./metadata.js";
import { COMMODITIES_ROUND_COUNT } from "./daily-scores.js";
import { rankCommoditiesEntries } from "./ranking.js";

export type CommoditiesLineupOutlookTier =
  | "favorite"
  | "in_the_hunt"
  | "outside_shot"
  | "effectively_out";

export type CommoditiesCommentaryStageId =
  | "opening_day"
  | "midweek"
  | "late_week"
  | "final_day"
  | "unknown";

export interface CommoditiesContestCommentaryEntry {
  entryId: string;
  displayName?: string;
  prediction: unknown | null;
  createdAt: Date;
  eventParticipantIds: string[];
}

export interface CommoditiesContestCommentaryParticipant {
  eventParticipantId: string;
  displayName: string;
  scoreData: unknown;
  total: number;
}

export interface AnalyzeCommoditiesContestCommentaryInput {
  contestId: string;
  eventId: string;
  /** Active scoring period (1–5), or null when unknown. */
  currentPeriod?: number | null;
  /**
   * Latest fully settled trading day (1–5). When omitted, derived from
   * participant scoreData (highest non-provisional round).
   */
  settledPeriod?: number | null;
  paidCount: number;
  entries: CommoditiesContestCommentaryEntry[];
  participants: CommoditiesContestCommentaryParticipant[];
  popularity?: PopularityRules | null;
  pickRates?: Record<string, number> | null;
  externalId?: string | null;
}

export interface CommoditiesContestCommentaryLineup {
  entryId: string;
  displayName: string;
  scoreNow: number;
  positionNow: number;
  gapToCut: number;
  tier: CommoditiesLineupOutlookTier;
  picks: Array<{
    eventParticipantId: string;
    displayName: string;
  }>;
}

export interface CommoditiesDayMover {
  eventParticipantId: string;
  displayName: string;
  dayPoints: number;
  pctReturn: number | null;
  ownership: string;
  ownersCount: number;
  ownerEntryIds: string[];
  ownerNames: string[];
}

export interface CommoditiesConsensusPick {
  eventParticipantId: string;
  displayName: string;
  ownership: string;
  ownershipShare: number;
}

export interface CommoditiesContestCommentaryEventProgress {
  period: number | null;
  settledPeriod: number | null;
  stageId: CommoditiesCommentaryStageId;
  dayLabel: string | null;
  roundsRemaining: number;
}

export interface CommoditiesContestCommentaryContext {
  contestId: string;
  eventId: string;
  externalId: string | null;
  period: number | null;
  settledPeriod: number | null;
  paidCount: number;
  eventProgress: CommoditiesContestCommentaryEventProgress;
  race: {
    leaderScore: number;
    cutScore: number;
    contenderCount: number;
  };
  contentionLineups: CommoditiesContestCommentaryLineup[];
  dayMovers: CommoditiesDayMover[];
  consensusPicks: CommoditiesConsensusPick[];
  sharedPicks: Array<{
    eventParticipantId: string;
    displayName: string;
    entryIds: string[];
    entryNames: string[];
  }>;
  uncertaintyNotes: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const ROUND_KEYS = ["r1", "r2", "r3", "r4", "r5"] as const satisfies ReadonlyArray<
  keyof CommodityScoreData
>;

export function parseCommodityScoreData(scoreData: unknown): CommodityScoreData | null {
  const record = asRecord(scoreData);
  if (!record) return null;
  return record as CommodityScoreData;
}

export function readRoundScore(
  scoreData: unknown,
  roundNumber: number,
): CommodityRoundScoreData | null {
  if (roundNumber < 1 || roundNumber > COMMODITIES_ROUND_COUNT) return null;
  const parsed = parseCommodityScoreData(scoreData);
  if (!parsed) return null;
  const round = parsed[ROUND_KEYS[roundNumber - 1]!];
  if (!round || typeof round !== "object") return null;
  return round;
}

/**
 * Highest fully settled (non-provisional) round across the field.
 * Returns 0 when no day has settled yet.
 */
export function resolveSettledPeriodFromScoreData(
  participants: readonly { scoreData: unknown }[],
): number {
  let settled = 0;
  for (let round = 1; round <= COMMODITIES_ROUND_COUNT; round++) {
    let anyFinal = false;
    let anyProvisional = false;
    for (const participant of participants) {
      const roundScore = readRoundScore(participant.scoreData, round);
      if (!roundScore) continue;
      if (roundScore.provisional === true) {
        anyProvisional = true;
      } else if (typeof roundScore.total === "number") {
        anyFinal = true;
      }
    }
    if (anyFinal && !anyProvisional) {
      settled = round;
    } else if (anyProvisional) {
      break;
    }
  }
  return settled;
}

export function resolveCommoditiesCommentaryStage(
  settledPeriod: number | null | undefined,
): CommoditiesCommentaryStageId {
  if (settledPeriod == null || !Number.isFinite(settledPeriod) || settledPeriod < 1) {
    return "unknown";
  }
  const rounded = Math.round(settledPeriod);
  if (rounded === 1) return "opening_day";
  if (rounded === 2 || rounded === 3) return "midweek";
  if (rounded === 4) return "late_week";
  if (rounded === 5) return "final_day";
  return "unknown";
}

export function dayLabelForPeriod(period: number | null | undefined): string | null {
  if (period == null || !Number.isFinite(period)) return null;
  const index = Math.round(period) - 1;
  const labels = COMMODITIES_PERIOD_RULES.labels ?? [];
  return labels[index] ?? null;
}

function ownershipLabel(ownersCount: number, lineupCount: number): string {
  if (lineupCount <= 0) return "0/0";
  return `${ownersCount}/${lineupCount}`;
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

function outlookTier(
  positionNow: number,
  paidCount: number,
  gapToCut: number,
  roundsRemaining: number,
): CommoditiesLineupOutlookTier {
  if (positionNow === 1) return "favorite";
  if (positionNow <= paidCount) return "in_the_hunt";
  if (roundsRemaining <= 1 && gapToCut < -15) return "effectively_out";
  if (gapToCut < -25 && roundsRemaining <= 2) return "effectively_out";
  if (positionNow <= paidCount + 2 || gapToCut >= -10) return "outside_shot";
  return "effectively_out";
}

/**
 * Build a compact end-of-day contest context for Cutbot overview commentary.
 * No Monte Carlo — race standings, day movers, ownership, and period progress only.
 */
export function analyzeCommoditiesContestCommentary(
  input: AnalyzeCommoditiesContestCommentaryInput,
): CommoditiesContestCommentaryContext {
  const lineupCount = input.entries.length;
  if (lineupCount === 0) {
    throw new Error("analyzeCommoditiesContestCommentary requires at least one entry");
  }

  const settledPeriod =
    input.settledPeriod != null && Number.isFinite(input.settledPeriod)
      ? Math.max(0, Math.round(input.settledPeriod))
      : resolveSettledPeriodFromScoreData(input.participants);

  const period =
    input.currentPeriod != null && Number.isFinite(input.currentPeriod)
      ? Math.round(input.currentPeriod)
      : settledPeriod > 0
        ? settledPeriod
        : null;

  const roundsRemaining =
    settledPeriod > 0
      ? Math.max(0, COMMODITIES_ROUND_COUNT - settledPeriod)
      : COMMODITIES_ROUND_COUNT;

  const stageId = resolveCommoditiesCommentaryStage(
    settledPeriod > 0 ? settledPeriod : null,
  );

  const participantsById = new Map(
    input.participants.map((participant) => [
      participant.eventParticipantId,
      participant,
    ]),
  );
  const totalsById = new Map(
    input.participants.map((participant) => [
      participant.eventParticipantId,
      participant.total,
    ]),
  );

  const scoredEntries = input.entries.map((entry) => ({
    entryId: entry.entryId,
    score: scoreLineupFromTotals(
      entry.eventParticipantIds,
      totalsById,
      input.pickRates,
      input.popularity,
    ),
    prediction: entry.prediction,
    createdAt: entry.createdAt,
  }));

  const ranked = rankCommoditiesEntries(scoredEntries);
  const rankByEntry = new Map(ranked.map((row) => [row.entryId, row]));
  const paidCount = Math.max(1, Math.min(input.paidCount, lineupCount));
  const cutScore =
    ranked[Math.min(paidCount, ranked.length) - 1]?.score ?? ranked[0]?.score ?? 0;
  const leaderScore = ranked[0]?.score ?? 0;

  const contentionLineups: CommoditiesContestCommentaryLineup[] = input.entries
    .map((entry) => {
      const rankedRow = rankByEntry.get(entry.entryId)!;
      const gapToCut = rankedRow.score - cutScore;
      return {
        entryId: entry.entryId,
        displayName: entry.displayName?.trim() || entry.entryId,
        scoreNow: rankedRow.score,
        positionNow: rankedRow.position,
        gapToCut,
        tier: outlookTier(
          rankedRow.position,
          paidCount,
          gapToCut,
          roundsRemaining,
        ),
        picks: entry.eventParticipantIds.map((eventParticipantId) => {
          const participant = participantsById.get(eventParticipantId);
          return {
            eventParticipantId,
            displayName:
              participant?.displayName ?? eventParticipantId,
          };
        }),
      };
    })
    .sort((a, b) => a.positionNow - b.positionNow);

  const ownersByParticipant = new Map<
    string,
    { entryIds: string[]; names: string[] }
  >();
  for (const entry of input.entries) {
    for (const participantId of new Set(entry.eventParticipantIds)) {
      const row =
        ownersByParticipant.get(participantId) ?? {
          entryIds: [],
          names: [],
        };
      row.entryIds.push(entry.entryId);
      const name = entry.displayName?.trim();
      if (name) row.names.push(name);
      ownersByParticipant.set(participantId, row);
    }
  }

  const dayMovers: CommoditiesDayMover[] = [];
  if (settledPeriod >= 1) {
    for (const participant of input.participants) {
      const ownership = ownersByParticipant.get(participant.eventParticipantId);
      if (!ownership || ownership.entryIds.length === 0) continue;
      const round = readRoundScore(participant.scoreData, settledPeriod);
      if (!round || round.provisional === true) continue;
      const dayPoints =
        typeof round.total === "number" && Number.isFinite(round.total)
          ? round.total
          : 0;
      const pctReturn =
        typeof round.pctReturn === "number" && Number.isFinite(round.pctReturn)
          ? round.pctReturn
          : null;
      dayMovers.push({
        eventParticipantId: participant.eventParticipantId,
        displayName: participant.displayName,
        dayPoints,
        pctReturn,
        ownership: ownershipLabel(ownership.entryIds.length, lineupCount),
        ownersCount: ownership.entryIds.length,
        ownerEntryIds: ownership.entryIds,
        ownerNames: ownership.names,
      });
    }
    dayMovers.sort(
      (a, b) => Math.abs(b.dayPoints) - Math.abs(a.dayPoints) || b.dayPoints - a.dayPoints,
    );
  }

  const consensusPicks: CommoditiesConsensusPick[] = [...ownersByParticipant.entries()]
    .map(([eventParticipantId, ownership]) => {
      const participant = participantsById.get(eventParticipantId);
      const ownershipShare = ownership.entryIds.length / lineupCount;
      return {
        eventParticipantId,
        displayName: participant?.displayName ?? eventParticipantId,
        ownership: ownershipLabel(ownership.entryIds.length, lineupCount),
        ownershipShare: Math.round(ownershipShare * 1000) / 1000,
      };
    })
    .filter((row) => row.ownershipShare >= 0.4)
    .sort((a, b) => b.ownershipShare - a.ownershipShare)
    .slice(0, 5);

  const sharedPicks = [...ownersByParticipant.entries()]
    .filter(([, ownership]) => ownership.entryIds.length >= 2)
    .map(([eventParticipantId, ownership]) => ({
      eventParticipantId,
      displayName:
        participantsById.get(eventParticipantId)?.displayName ??
        eventParticipantId,
      entryIds: ownership.entryIds,
      entryNames: ownership.names,
    }))
    .sort((a, b) => b.entryIds.length - a.entryIds.length)
    .slice(0, 6);

  const uncertaintyNotes: string[] = [];
  if (settledPeriod === 0) {
    uncertaintyNotes.push(
      "No trading day has fully settled yet; standings may still be provisional.",
    );
  } else if (roundsRemaining >= 3) {
    uncertaintyNotes.push(
      "Most of the week remains; early leaders can still be caught.",
    );
  } else if (roundsRemaining === 1) {
    uncertaintyNotes.push("One trading day remains.");
  } else if (roundsRemaining === 0) {
    uncertaintyNotes.push("All five daily legs are settled.");
  }

  const missingPrediction = input.entries.some(
    (entry) => parseLineupPrediction(entry.prediction) == null,
  );
  if (missingPrediction) {
    uncertaintyNotes.push(
      "Some entries are missing a tie-break prediction.",
    );
  }

  return {
    contestId: input.contestId,
    eventId: input.eventId,
    externalId: input.externalId ?? null,
    period,
    settledPeriod: settledPeriod > 0 ? settledPeriod : null,
    paidCount,
    eventProgress: {
      period,
      settledPeriod: settledPeriod > 0 ? settledPeriod : null,
      stageId,
      dayLabel: dayLabelForPeriod(settledPeriod > 0 ? settledPeriod : null),
      roundsRemaining,
    },
    race: {
      leaderScore,
      cutScore,
      contenderCount: contentionLineups.filter(
        (lineup) =>
          lineup.tier === "favorite" ||
          lineup.tier === "in_the_hunt" ||
          lineup.tier === "outside_shot",
      ).length,
    },
    contentionLineups: contentionLineups.filter(
      (lineup) => lineup.tier !== "effectively_out",
    ),
    dayMovers: dayMovers.slice(0, 6),
    consensusPicks,
    sharedPicks,
    uncertaintyNotes,
  };
}
