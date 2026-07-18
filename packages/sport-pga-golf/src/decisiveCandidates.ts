import {
  adjustPickScore,
  defaultPayoutVector,
  normalizePopularityRules,
  type PopularityRules,
} from "@cut/sport-sdk";
import {
  buildGenericScoringModel,
  createSeededRandom,
  quantile,
  remainingRoundPlan,
  sampleRoundPlan,
  type GenericScoringModel,
  type RemainingRoundPlan,
} from "./genericProjection.js";
import { positionBonus } from "./live-scores.js";
import { rankGolfEntries } from "./ranking.js";

export interface AnalyzeDecisiveCandidatesOptions {
  simulations?: number;
  seed?: number;
  minPayoutProbability?: number;
}

export interface DecisiveCandidateEntry {
  entryId: string;
  displayName?: string;
  prediction: unknown | null;
  createdAt: Date;
  eventParticipantIds: string[];
}

export interface DecisiveCandidateParticipant {
  eventParticipantId: string;
  displayName: string;
  scoreData: unknown;
  total: number;
}

export interface AnalyzeDecisiveCandidatesInput {
  contestId: string;
  eventId: string;
  currentPeriod?: number | null;
  entries: DecisiveCandidateEntry[];
  /** Full event field; contest picks are a subset. */
  participants: DecisiveCandidateParticipant[];
  scoringModel?: GenericScoringModel;
  popularity?: PopularityRules | null;
  pickRates?: Record<string, number> | null;
  options?: AnalyzeDecisiveCandidatesOptions;
}

export type LineupOutlookTier =
  | "favorite"
  | "in_the_hunt"
  | "outside_shot"
  | "effectively_out";

export interface LineupOutlook {
  entryId: string;
  displayName: string;
  scoreNow: number;
  positionNow: number;
  gapToCut: number;
  projectedLow: number;
  projectedMedian: number;
  projectedHigh: number;
  winProbability: number;
  payoutProbability: number;
  tier: LineupOutlookTier;
}

export interface ContentionSummary {
  entryIds: string[];
  leaderScore: number;
  cutScore: number;
  paidCount: number;
  definition: "plausible_payout_probability";
}

export interface DecisiveCandidateRow {
  eventParticipantId: string;
  displayName: string;
  ownership: string;
  ownersCount: number;
  lineupCount: number;
  holesLeft: number;
  roundsLeft: number;
  likelyRemaining: {
    low: number;
    median: number;
    high: number;
  };
  payoutSwing: number;
  ownerPayoutWhenCold: number;
  ownerPayoutWhenHot: number;
  affectedEntryIds: string[];
  affectedUserNames: string[];
}

export interface ConsensusCandidateRow {
  eventParticipantId: string;
  displayName: string;
  ownership: string;
  ownersCount: number;
  cohortSize: number;
  payoutSwing: number;
  consensusStrength: number;
  reason: string;
}

export interface DecisiveCandidatesReport {
  contestId: string;
  eventId: string;
  period: number | null;
  paidCount: number;
  popularityWeight: number;
  simulationCount: number;
  seed: number;
  contention: ContentionSummary;
  lineupOutlooks: LineupOutlook[];
  decisive: DecisiveCandidateRow[];
  consensus: ConsensusCandidateRow[];
  notes: string[];
}

interface ParticipantState {
  participant: DecisiveCandidateParticipant;
  plans: RemainingRoundPlan[];
  stablefordNow: number;
  leaderboardNow: number;
  status: string;
}

interface ScenarioRecord {
  paidSet: Set<string>;
  remainingByParticipant: Map<string, number>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function scoreDataNumber(scoreData: unknown, key: string): number | null {
  const value = asRecord(scoreData)?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function leaderboardTotal(scoreData: unknown): number {
  const raw = asRecord(scoreData)?.leaderboardTotal;
  if (raw === "E" || raw === "EVEN" || raw === "Even") return 0;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function leaderboardStatus(scoreData: unknown): string {
  const position = asRecord(scoreData)?.leaderboardPosition;
  return typeof position === "string" ? position.toUpperCase() : "";
}

function stablefordNow(participant: DecisiveCandidateParticipant): number {
  const direct = scoreDataNumber(participant.scoreData, "stableford");
  if (direct != null) return direct;
  const cut = scoreDataNumber(participant.scoreData, "cut") ?? 0;
  const bonus = scoreDataNumber(participant.scoreData, "bonus") ?? 0;
  return participant.total - cut - bonus;
}

function probability(value: number): number {
  return Math.round(value * 10_000) / 10_000;
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

function assignFinishBonuses(
  projectedStrokes: Map<string, number>,
): Map<string, number> {
  const sorted = [...projectedStrokes].sort((a, b) => a[1] - b[1]);
  const bonuses = new Map<string, number>();
  let previousScore: number | null = null;
  let position = 0;
  for (let index = 0; index < sorted.length; index++) {
    const [participantId, score] = sorted[index]!;
    if (score !== previousScore) position = index + 1;
    bonuses.set(participantId, positionBonus(String(position)));
    previousScore = score;
  }
  return bonuses;
}

function madeCutIds(
  states: readonly ParticipantState[],
  strokesThroughRoundTwo: Map<string, number>,
  period: number | null,
): Set<string> {
  if (period != null && period >= 3) {
    return new Set(
      states
        .filter((state) => state.status !== "CUT" && state.status !== "WD")
        .map((state) => state.participant.eventParticipantId),
    );
  }

  const eligible = states
    .filter((state) => state.status !== "WD")
    .map((state) => [
      state.participant.eventParticipantId,
      strokesThroughRoundTwo.get(state.participant.eventParticipantId) ??
        state.leaderboardNow,
    ] as const)
    .sort((a, b) => a[1] - b[1]);
  const cutoffIndex = Math.min(64, eligible.length - 1);
  const cutoffScore = eligible[cutoffIndex]?.[1] ?? Number.POSITIVE_INFINITY;
  return new Set(
    eligible.filter(([, score]) => score <= cutoffScore).map(([id]) => id),
  );
}

function tierFor(
  payoutProbability: number,
  isTopPayoutChance: boolean,
  minPayoutProbability: number,
): LineupOutlookTier {
  if (isTopPayoutChance && payoutProbability > 0) return "favorite";
  if (payoutProbability >= 0.15) return "in_the_hunt";
  if (payoutProbability >= minPayoutProbability) return "outside_shot";
  return "effectively_out";
}

function ownerPayoutRate(
  records: readonly ScenarioRecord[],
  participantId: string,
  owners: ReadonlySet<string>,
  threshold: number,
  direction: "cold" | "hot",
): number {
  let opportunities = 0;
  let paid = 0;
  for (const record of records) {
    const remaining = record.remainingByParticipant.get(participantId) ?? 0;
    const include = direction === "cold" ? remaining <= threshold : remaining >= threshold;
    if (!include) continue;
    for (const entryId of owners) {
      opportunities++;
      if (record.paidSet.has(entryId)) paid++;
    }
  }
  return opportunities > 0 ? paid / opportunities : 0;
}

/**
 * Produces a commentary-oriented contest outlook from generic PGA outcomes.
 * It estimates plausible chances; it does not claim mathematical elimination.
 */
export function analyzeDecisiveCandidates(
  input: AnalyzeDecisiveCandidatesInput,
): DecisiveCandidatesReport {
  const entries = input.entries.filter((entry) => entry.entryId);
  const paidCount = Math.max(1, defaultPayoutVector(entries.length).length);
  const period = input.currentPeriod ?? null;
  const rules = normalizePopularityRules(input.popularity);
  const simulationCount = Math.min(
    10_000,
    Math.max(100, Math.round(input.options?.simulations ?? 2_000)),
  );
  const seed = Math.round(input.options?.seed ?? 2026);
  const minPayoutProbability = Math.min(
    0.25,
    Math.max(0, input.options?.minPayoutProbability ?? 0.02),
  );
  const model = input.scoringModel ?? buildGenericScoringModel([]);
  const notes: string[] = [
    "Outlooks use a generic PGA golfer distribution; player skill and form are intentionally not modeled.",
  ];
  if (period != null && period < 3) {
    notes.push(
      `currentPeriod=${period}; cut and future-round uncertainty make this an early structural outlook.`,
    );
  }
  if (model.sampleCount === 0) {
    notes.push("Historical calibration was unavailable; built-in generic scoring frequencies were used.");
  }
  if (entries.length === 0) {
    return {
      contestId: input.contestId,
      eventId: input.eventId,
      period,
      paidCount,
      popularityWeight: rules.weight,
      simulationCount,
      seed,
      contention: {
        entryIds: [],
        leaderScore: 0,
        cutScore: 0,
        paidCount,
        definition: "plausible_payout_probability",
      },
      lineupOutlooks: [],
      decisive: [],
      consensus: [],
      notes: [...notes, "No contest entries to analyze."],
    };
  }

  const states: ParticipantState[] = input.participants.map((participant) => ({
    participant,
    plans: remainingRoundPlan(participant.scoreData, period),
    stablefordNow: stablefordNow(participant),
    leaderboardNow: leaderboardTotal(participant.scoreData),
    status: leaderboardStatus(participant.scoreData),
  }));
  const stateById = new Map(
    states.map((state) => [state.participant.eventParticipantId, state]),
  );
  const currentTotals = new Map(
    states.map((state) => [
      state.participant.eventParticipantId,
      state.participant.total,
    ]),
  );
  const currentRanked = rankGolfEntries(
    entries.map((entry) => ({
      entryId: entry.entryId,
      prediction: entry.prediction,
      createdAt: entry.createdAt,
      score: scoreLineupFromTotals(
        entry.eventParticipantIds,
        currentTotals,
        input.pickRates,
        input.popularity,
      ),
    })),
  );
  const currentById = new Map(currentRanked.map((entry) => [entry.entryId, entry]));
  const leaderScore = currentRanked[0]?.score ?? 0;
  const cutScore =
    currentRanked[Math.min(paidCount, currentRanked.length) - 1]?.score ?? 0;

  const projectedScores = new Map(entries.map((entry) => [entry.entryId, [] as number[]]));
  const wins = new Map(entries.map((entry) => [entry.entryId, 0]));
  const payouts = new Map(entries.map((entry) => [entry.entryId, 0]));
  const records: ScenarioRecord[] = [];
  const random = createSeededRandom(seed);

  for (let simulation = 0; simulation < simulationCount; simulation++) {
    const sampledById = new Map<
      string,
      ReturnType<typeof sampleRoundPlan>
    >();
    const strokesThroughRoundTwo = new Map<string, number>();
    for (const state of states) {
      const sampled = sampleRoundPlan(state.plans, model, random);
      sampledById.set(state.participant.eventParticipantId, sampled);
      let strokes = state.leaderboardNow;
      for (const [round, outcome] of sampled) {
        if (round <= 2) strokes += outcome.strokesToPar;
      }
      strokesThroughRoundTwo.set(state.participant.eventParticipantId, strokes);
    }

    const madeCut = madeCutIds(states, strokesThroughRoundTwo, period);
    const projectedStrokes = new Map<string, number>();
    const remainingByParticipant = new Map<string, number>();
    for (const state of states) {
      const id = state.participant.eventParticipantId;
      if (!madeCut.has(id)) continue;
      let strokes = state.leaderboardNow;
      let stableford = 0;
      for (const [round, outcome] of sampledById.get(id) ?? []) {
        if (round <= 2 || madeCut.has(id)) {
          strokes += outcome.strokesToPar;
          stableford += outcome.stableford;
        }
      }
      projectedStrokes.set(id, strokes);
      remainingByParticipant.set(id, stableford);
    }
    for (const state of states) {
      if (!remainingByParticipant.has(state.participant.eventParticipantId)) {
        let stableford = 0;
        for (const [round, outcome] of
          sampledById.get(state.participant.eventParticipantId) ?? []) {
          if (round <= 2) stableford += outcome.stableford;
        }
        remainingByParticipant.set(state.participant.eventParticipantId, stableford);
      }
    }

    const finishBonuses = assignFinishBonuses(projectedStrokes);
    const projectedTotals = new Map<string, number>();
    for (const state of states) {
      const id = state.participant.eventParticipantId;
      const madeCutBonus = madeCut.has(id) ? 3 : 0;
      projectedTotals.set(
        id,
        state.stablefordNow +
          (remainingByParticipant.get(id) ?? 0) +
          madeCutBonus +
          (finishBonuses.get(id) ?? 0),
      );
    }

    const ranked = rankGolfEntries(
      entries.map((entry) => {
        const score = scoreLineupFromTotals(
          entry.eventParticipantIds,
          projectedTotals,
          input.pickRates,
          input.popularity,
        );
        projectedScores.get(entry.entryId)!.push(score);
        return {
          entryId: entry.entryId,
          prediction: entry.prediction,
          createdAt: entry.createdAt,
          score,
        };
      }),
    );
    const paidSet = new Set(ranked.slice(0, paidCount).map((entry) => entry.entryId));
    const winner = ranked[0]?.entryId;
    if (winner) wins.set(winner, (wins.get(winner) ?? 0) + 1);
    for (const entryId of paidSet) {
      payouts.set(entryId, (payouts.get(entryId) ?? 0) + 1);
    }
    records.push({ paidSet, remainingByParticipant });
  }

  const rawOutlooks = entries.map((entry) => {
    const current = currentById.get(entry.entryId);
    const scores = projectedScores.get(entry.entryId) ?? [];
    const payoutProbability = (payouts.get(entry.entryId) ?? 0) / simulationCount;
    return {
      entryId: entry.entryId,
      displayName: entry.displayName?.trim() || entry.entryId,
      scoreNow: current?.score ?? 0,
      positionNow: current?.position ?? entries.length,
      gapToCut: Math.max(0, cutScore - (current?.score ?? 0)),
      projectedLow: quantile(scores, 0.1),
      projectedMedian: quantile(scores, 0.5),
      projectedHigh: quantile(scores, 0.9),
      winProbability: probability((wins.get(entry.entryId) ?? 0) / simulationCount),
      payoutProbability: probability(payoutProbability),
      tier: "effectively_out" as LineupOutlookTier,
    };
  });
  const maxPayoutProbability = Math.max(
    ...rawOutlooks.map((outlook) => outlook.payoutProbability),
  );
  const lineupOutlooks = rawOutlooks
    .map((outlook) => ({
      ...outlook,
      tier: tierFor(
        outlook.payoutProbability,
        outlook.payoutProbability === maxPayoutProbability,
        minPayoutProbability,
      ),
    }))
    .sort(
      (a, b) =>
        b.payoutProbability - a.payoutProbability ||
        a.positionNow - b.positionNow,
    );
  const contentionIds = lineupOutlooks
    .filter((outlook) => outlook.tier !== "effectively_out")
    .map((outlook) => outlook.entryId);
  const consensusCohortIds = contentionIds;
  const consensusCohort = new Set(consensusCohortIds);
  const consensusThreshold = Math.ceil(consensusCohortIds.length * 0.5);

  const ownersByParticipant = new Map<string, Set<string>>();
  for (const entry of entries) {
    for (const participantId of new Set(entry.eventParticipantIds)) {
      let owners = ownersByParticipant.get(participantId);
      if (!owners) {
        owners = new Set();
        ownersByParticipant.set(participantId, owners);
      }
      owners.add(entry.entryId);
    }
  }
  const entryById = new Map(entries.map((entry) => [entry.entryId, entry]));
  const decisive: DecisiveCandidateRow[] = [];
  const consensus: ConsensusCandidateRow[] = [];
  for (const [participantId, owners] of ownersByParticipant) {
    const state = stateById.get(participantId);
    if (!state) continue;
    const remaining = records.map(
      (record) => record.remainingByParticipant.get(participantId) ?? 0,
    );
    const low = quantile(remaining, 0.1);
    const median = quantile(remaining, 0.5);
    const high = quantile(remaining, 0.9);
    if (state.plans.length === 0 || high === low) continue;
    const coldThreshold = quantile(remaining, 0.25);
    const hotThreshold = quantile(remaining, 0.75);
    const cold = ownerPayoutRate(records, participantId, owners, coldThreshold, "cold");
    const hot = ownerPayoutRate(records, participantId, owners, hotThreshold, "hot");
    const payoutSwing = probability(Math.max(0, hot - cold));
    const cohortOwners = [...owners].filter((entryId) =>
      consensusCohort.has(entryId),
    );
    if (
      consensusCohortIds.length > 0 &&
      cohortOwners.length >= Math.max(2, consensusThreshold)
    ) {
      const ownershipShare = cohortOwners.length / consensusCohortIds.length;
      consensus.push({
        eventParticipantId: participantId,
        displayName: state.participant.displayName,
        ownership: `${cohortOwners.length}/${consensusCohortIds.length}`,
        ownersCount: cohortOwners.length,
        cohortSize: consensusCohortIds.length,
        payoutSwing,
        consensusStrength: probability(
          ownershipShare * (1 - payoutSwing),
        ),
        reason: `shared by ${cohortOwners.length} of ${consensusCohortIds.length} plausible contenders with limited relative payout impact`,
      });
    }
    if (owners.size === entries.length) continue;
    decisive.push({
      eventParticipantId: participantId,
      displayName: state.participant.displayName,
      ownership: `${owners.size}/${entries.length}`,
      ownersCount: owners.size,
      lineupCount: entries.length,
      holesLeft: state.plans.reduce((sum, plan) => sum + plan.pars.length, 0),
      roundsLeft: state.plans.length,
      likelyRemaining: { low, median, high },
      payoutSwing,
      ownerPayoutWhenCold: probability(cold),
      ownerPayoutWhenHot: probability(hot),
      affectedEntryIds: [...owners],
      affectedUserNames: [...owners].map(
        (entryId) => entryById.get(entryId)?.displayName?.trim() || entryId,
      ),
    });
  }
  decisive.sort(
    (a, b) =>
      b.payoutSwing - a.payoutSwing ||
      a.ownersCount - b.ownersCount ||
      a.displayName.localeCompare(b.displayName),
  );
  consensus.sort(
    (a, b) =>
      b.consensusStrength - a.consensusStrength ||
      a.payoutSwing - b.payoutSwing ||
      a.displayName.localeCompare(b.displayName),
  );

  return {
    contestId: input.contestId,
    eventId: input.eventId,
    period,
    paidCount,
    popularityWeight: rules.weight,
    simulationCount,
    seed,
    contention: {
      entryIds: contentionIds,
      leaderScore,
      cutScore,
      paidCount,
      definition: "plausible_payout_probability",
    },
    lineupOutlooks,
    decisive,
    consensus,
    notes,
  };
}

export { scoreLineupFromTotals };
