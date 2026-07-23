import {
  adjustPickScore,
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

export interface ContestCommentaryAnalysisOptions {
  simulations?: number;
  seed?: number;
  minPayoutProbability?: number;
}

export interface ContestCommentaryEntry {
  entryId: string;
  displayName?: string;
  prediction: unknown | null;
  createdAt: Date;
  eventParticipantIds: string[];
}

export interface ContestCommentaryParticipant {
  eventParticipantId: string;
  displayName: string;
  scoreData: unknown;
  total: number;
}

export interface AnalyzeContestCommentaryInput {
  contestId: string;
  eventId: string;
  currentPeriod?: number | null;
  paidCount: number;
  entries: ContestCommentaryEntry[];
  /** Full event field; contest picks are a subset. */
  participants: ContestCommentaryParticipant[];
  scoringModel?: GenericScoringModel;
  popularity?: PopularityRules | null;
  pickRates?: Record<string, number> | null;
  options?: ContestCommentaryAnalysisOptions;
}

export type LineupOutlookTier =
  | "favorite"
  | "in_the_hunt"
  | "outside_shot"
  | "effectively_out";

interface DecisiveCandidateRow {
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

interface ConsensusCandidateRow {
  eventParticipantId: string;
  displayName: string;
  ownership: string;
  ownersCount: number;
  cohortSize: number;
  payoutSwing: number;
  consensusStrength: number;
  reason: string;
}

export interface ContestCommentaryLineup {
  entryId: string;
  displayName: string;
  scoreNow: number;
  positionNow: number;
  gapToCut: number;
  tier: LineupOutlookTier;
  winProbability: number;
  payoutProbability: number;
}

export interface ContestCommentaryPlayer {
  eventParticipantId: string;
  displayName: string;
  ownership: string;
  ownersCount: number;
  cohortSize: number;
  ownershipShare: number;
  leverage: number;
  payoutSwing: number;
  holesLeft: number;
  ownerEntryIds: string[];
  ownerNames: string[];
}

export interface ContestCommentaryLineupRarity {
  entryId: string;
  displayName: string;
  scoreNow: number;
  positionNow: number;
  tier: LineupOutlookTier;
  rarityScore: number;
  highLeveragePlayers: Array<{
    eventParticipantId: string;
    displayName: string;
    ownership: string;
  }>;
}

export interface ContestCommentaryConsensusPlayer {
  eventParticipantId: string;
  displayName: string;
  ownership: string;
  ownershipShare: number;
  payoutSwing: number;
  consensusStrength: number;
}

export type ContestCommentaryRoutePlausibility =
  | "multiple_routes"
  | "narrow_route"
  | "miracle_route";

export interface ContestCommentaryRouteNeed {
  eventParticipantId: string;
  displayName: string;
  baselineRemainingMedian: number;
  routeRemainingMedian: number;
  requiredPercentile: number;
  sharedWithEntryIds: string[];
  sharedWithNames: string[];
}

export interface ContestCommentaryLineupRoute {
  entryId: string;
  displayName: string;
  target: "win" | "best_simulated_finish";
  scenarioCount: number;
  bestSimulatedFinish: number;
  plausibility: ContestCommentaryRoutePlausibility;
  requiredHoleInOnes: number;
  keyNeeds: ContestCommentaryRouteNeed[];
}

export interface ContestCommentarySharedDependency {
  eventParticipantId: string;
  displayName: string;
  entryIds: string[];
  entryNames: string[];
}

export interface ContestCommentarySharedDownsideRisk {
  eventParticipantId: string;
  displayName: string;
  ownership: string;
  ownerEntryIds: string[];
  ownerNames: string[];
  medianRemaining: number;
  downsideRemaining: number;
  downsideSwing: number;
  negativeRemainingProbability: number;
  negativeHoleProbability: number;
}

export type ContestCommentaryStageId =
  | "opening_round"
  | "cut_round"
  | "weekend_move"
  | "final_round"
  | "unknown";

export type ContestCommentaryLeaderPace =
  | "not_started"
  | "front_nine"
  | "approaching_turn"
  | "back_nine"
  | "closing"
  | "finished";

export interface ContestCommentaryLeaderProgress {
  holesRemaining: number | null;
  pace: ContestCommentaryLeaderPace;
  leaderParticipantIds: string[];
  leaderNames: string[];
}

export interface ContestCommentaryEventProgress {
  period: number | null;
  stageId: ContestCommentaryStageId;
  /** Present only for weekend_move / final_round */
  leaderProgress?: ContestCommentaryLeaderProgress;
}

export interface ContestCommentaryContext {
  period: number | null;
  paidCount: number;
  eventProgress: ContestCommentaryEventProgress;
  race: {
    leaderScore: number;
    cutScore: number;
    contenderCount: number;
  };
  contentionLineups: ContestCommentaryLineup[];
  lineupRoutes: ContestCommentaryLineupRoute[];
  sharedDependencies: ContestCommentarySharedDependency[];
  sharedDownsideRisks: ContestCommentarySharedDownsideRisk[];
  highLeveragePlayers: ContestCommentaryPlayer[];
  highRarityLineups: ContestCommentaryLineupRarity[];
  consensusPlayers: ContestCommentaryConsensusPlayer[];
  uncertaintyNotes: string[];
  simulation: {
    count: number;
    seed: number;
    popularityWeight: number;
  };
}

interface ParticipantState {
  participant: ContestCommentaryParticipant;
  plans: RemainingRoundPlan[];
  stablefordNow: number;
  leaderboardNow: number;
  status: string;
}

interface ScenarioRecord {
  paidSet: Set<string>;
  winnerEntryId: string | null;
  positionByEntry: Map<string, number>;
  remainingByParticipant: Map<string, number>;
  holeInOnesByParticipant: Map<string, number>;
  negativeHolesByParticipant: Map<string, number>;
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

function stablefordNow(participant: ContestCommentaryParticipant): number {
  const direct = scoreDataNumber(participant.scoreData, "stableford");
  if (direct != null) return direct;
  const cut = scoreDataNumber(participant.scoreData, "cut") ?? 0;
  const bonus = scoreDataNumber(participant.scoreData, "bonus") ?? 0;
  return participant.total - cut - bonus;
}

function probability(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function percentileRank(values: readonly number[], target: number): number {
  if (values.length === 0) return 0;
  return probability(
    values.filter((value) => value <= target).length / values.length,
  );
}

export function resolveCommentaryStage(
  period: number | null | undefined,
): ContestCommentaryStageId {
  if (period == null || !Number.isFinite(period)) return "unknown";
  const rounded = Math.round(period);
  if (rounded === 1) return "opening_round";
  if (rounded === 2) return "cut_round";
  if (rounded === 3) return "weekend_move";
  if (rounded === 4) return "final_round";
  return "unknown";
}

function stageIncludesLeaderProgress(stageId: ContestCommentaryStageId): boolean {
  return stageId === "weekend_move" || stageId === "final_round";
}

function leaderPace(
  holesRemaining: number | null,
): ContestCommentaryLeaderPace {
  if (holesRemaining == null) return "finished";
  if (holesRemaining >= 18) return "not_started";
  if (holesRemaining >= 11) return "front_nine";
  if (holesRemaining >= 9) return "approaching_turn";
  if (holesRemaining >= 4) return "back_nine";
  if (holesRemaining >= 1) return "closing";
  return "finished";
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
export function analyzeContestCommentary(
  input: AnalyzeContestCommentaryInput,
): ContestCommentaryContext {
  const entries = input.entries.filter((entry) => entry.entryId);
  const paidCount = Math.max(1, Math.round(input.paidCount));
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
    const stageId = resolveCommentaryStage(period);
    return {
      period,
      paidCount,
      eventProgress: {
        period,
        stageId,
      },
      race: {
        leaderScore: 0,
        cutScore: 0,
        contenderCount: 0,
      },
      contentionLineups: [],
      lineupRoutes: [],
      sharedDependencies: [],
      sharedDownsideRisks: [],
      highLeveragePlayers: [],
      highRarityLineups: [],
      consensusPlayers: [],
      uncertaintyNotes: [...notes, "No contest entries to analyze."],
      simulation: {
        count: simulationCount,
        seed,
        popularityWeight: rules.weight,
      },
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
  const stageId = resolveCommentaryStage(period);
  const tournamentLeaders = [...states]
    .filter((state) => state.status !== "CUT" && state.status !== "WD")
    .sort(
      (a, b) =>
        a.leaderboardNow - b.leaderboardNow ||
        a.participant.displayName.localeCompare(b.participant.displayName),
    )
    .slice(0, 3);
  const leaderHolesRemaining =
    typeof period === "number" && tournamentLeaders.length > 0
      ? quantile(
          tournamentLeaders.map(
            (state) =>
              state.plans.find((plan) => plan.round === period)?.pars.length ??
              0,
          ),
          0.5,
        )
      : null;
  const eventProgress: ContestCommentaryEventProgress = {
    period,
    stageId,
    ...(stageIncludesLeaderProgress(stageId)
      ? {
          leaderProgress: {
            holesRemaining: leaderHolesRemaining,
            pace: leaderPace(leaderHolesRemaining),
            leaderParticipantIds: tournamentLeaders.map(
              (state) => state.participant.eventParticipantId,
            ),
            leaderNames: tournamentLeaders.map(
              (state) => state.participant.displayName,
            ),
          },
        }
      : {}),
  };
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
    const holeInOnesByParticipant = new Map<string, number>();
    const negativeHolesByParticipant = new Map<string, number>();
    for (const state of states) {
      const id = state.participant.eventParticipantId;
      if (!madeCut.has(id)) continue;
      let strokes = state.leaderboardNow;
      let stableford = 0;
      let holeInOnes = 0;
      let negativeHoles = 0;
      for (const [round, outcome] of sampledById.get(id) ?? []) {
        if (round <= 2 || madeCut.has(id)) {
          strokes += outcome.strokesToPar;
          stableford += outcome.stableford;
          holeInOnes += outcome.holeInOnes;
          negativeHoles += outcome.negativeHoles;
        }
      }
      projectedStrokes.set(id, strokes);
      remainingByParticipant.set(id, stableford);
      holeInOnesByParticipant.set(id, holeInOnes);
      negativeHolesByParticipant.set(id, negativeHoles);
    }
    for (const state of states) {
      if (!remainingByParticipant.has(state.participant.eventParticipantId)) {
        let stableford = 0;
        let holeInOnes = 0;
        let negativeHoles = 0;
        for (const [round, outcome] of
          sampledById.get(state.participant.eventParticipantId) ?? []) {
          if (round <= 2) {
            stableford += outcome.stableford;
            holeInOnes += outcome.holeInOnes;
            negativeHoles += outcome.negativeHoles;
          }
        }
        remainingByParticipant.set(state.participant.eventParticipantId, stableford);
        holeInOnesByParticipant.set(
          state.participant.eventParticipantId,
          holeInOnes,
        );
        negativeHolesByParticipant.set(
          state.participant.eventParticipantId,
          negativeHoles,
        );
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
    records.push({
      paidSet,
      winnerEntryId: winner ?? null,
      positionByEntry: new Map(
        ranked.map((entry) => [entry.entryId, entry.position]),
      ),
      remainingByParticipant,
      holeInOnesByParticipant,
      negativeHolesByParticipant,
    });
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
  const favoriteEntryId = [...rawOutlooks]
    .filter((outlook) => outlook.payoutProbability === maxPayoutProbability)
    .sort((a, b) => a.positionNow - b.positionNow)[0]?.entryId;
  const lineupOutlooks = rawOutlooks
    .map((outlook) => ({
      ...outlook,
      tier: tierFor(
        outlook.payoutProbability,
        outlook.entryId === favoriteEntryId,
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
    const cohortOwners = [...owners].filter((entryId) =>
      consensusCohort.has(entryId),
    );
    if (cohortOwners.length === 0) continue;
    const cohortOwnerSet = new Set(cohortOwners);
    const coldThreshold = quantile(remaining, 0.25);
    const hotThreshold = quantile(remaining, 0.75);
    const cold = ownerPayoutRate(
      records,
      participantId,
      cohortOwnerSet,
      coldThreshold,
      "cold",
    );
    const hot = ownerPayoutRate(
      records,
      participantId,
      cohortOwnerSet,
      hotThreshold,
      "hot",
    );
    const payoutSwing = probability(Math.max(0, hot - cold));
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
    if (cohortOwners.length === consensusCohortIds.length) continue;
    decisive.push({
      eventParticipantId: participantId,
      displayName: state.participant.displayName,
      ownership: `${cohortOwners.length}/${consensusCohortIds.length}`,
      ownersCount: cohortOwners.length,
      lineupCount: consensusCohortIds.length,
      holesLeft: state.plans.reduce((sum, plan) => sum + plan.pars.length, 0),
      roundsLeft: state.plans.length,
      likelyRemaining: { low, median, high },
      payoutSwing,
      ownerPayoutWhenCold: probability(cold),
      ownerPayoutWhenHot: probability(hot),
      affectedEntryIds: cohortOwners,
      affectedUserNames: cohortOwners.map(
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

  const contentionSet = new Set(contentionIds);
  const contentionLineups: ContestCommentaryLineup[] = lineupOutlooks
    .filter((lineup) => contentionSet.has(lineup.entryId))
    .map((lineup) => ({
      entryId: lineup.entryId,
      displayName: lineup.displayName,
      scoreNow: lineup.scoreNow,
      positionNow: lineup.positionNow,
      gapToCut: lineup.gapToCut,
      tier: lineup.tier,
      winProbability: lineup.winProbability,
      payoutProbability: lineup.payoutProbability,
    }))
    .sort((a, b) => a.positionNow - b.positionNow);
  const cohortSize = contentionLineups.length;

  const lineupRoutes: ContestCommentaryLineupRoute[] = contentionLineups.map(
    (lineup) => {
      const entry = entryById.get(lineup.entryId);
      const picks = [...new Set(entry?.eventParticipantIds ?? [])];
      const winningScenarios = records.filter(
        (record) => record.winnerEntryId === lineup.entryId,
      );
      const bestSimulatedFinish = Math.min(
        ...records.map(
          (record) =>
            record.positionByEntry.get(lineup.entryId) ?? entries.length,
        ),
      );
      const routeScenarios =
        winningScenarios.length > 0
          ? winningScenarios
          : records.filter(
              (record) =>
                record.positionByEntry.get(lineup.entryId) ===
                bestSimulatedFinish,
            );
      const keyNeeds: ContestCommentaryRouteNeed[] = picks
        .flatMap((participantId) => {
          const state = stateById.get(participantId);
          if (!state || state.plans.length === 0) return [];
          const baseline = records.map(
            (record) =>
              record.remainingByParticipant.get(participantId) ?? 0,
          );
          const routeOutcomes = routeScenarios.map(
            (record) =>
              record.remainingByParticipant.get(participantId) ?? 0,
          );
          const baselineRemainingMedian = quantile(baseline, 0.5);
          const routeRemainingMedian = quantile(routeOutcomes, 0.5);
          const requiredPercentile = percentileRank(
            baseline,
            routeRemainingMedian,
          );
          if (
            routeRemainingMedian <= baselineRemainingMedian ||
            requiredPercentile < 0.55
          ) {
            return [];
          }
          const sharedOwners = [
            ...(ownersByParticipant.get(participantId) ?? []),
          ].filter(
            (entryId) =>
              entryId !== lineup.entryId && contentionSet.has(entryId),
          );
          return [
            {
              eventParticipantId: participantId,
              displayName: state.participant.displayName,
              baselineRemainingMedian,
              routeRemainingMedian,
              requiredPercentile,
              sharedWithEntryIds: sharedOwners,
              sharedWithNames: sharedOwners.map(
                (entryId) =>
                  entryById.get(entryId)?.displayName?.trim() || entryId,
              ),
            },
          ];
        })
        .sort(
          (a, b) =>
            b.requiredPercentile - a.requiredPercentile ||
            b.routeRemainingMedian -
              b.baselineRemainingMedian -
              (a.routeRemainingMedian - a.baselineRemainingMedian),
        )
        .slice(0, 3);
      const requiredHoleInOnes =
        routeScenarios.length > 0
          ? Math.min(
              ...routeScenarios.map((record) =>
                picks.reduce(
                  (sum, participantId) =>
                    sum +
                    (record.holeInOnesByParticipant.get(participantId) ?? 0),
                  0,
                ),
              ),
            )
          : 0;
      const highestRequiredPercentile = Math.max(
        0,
        ...keyNeeds.map((need) => need.requiredPercentile),
      );
      const plausibility: ContestCommentaryRoutePlausibility =
        requiredHoleInOnes > 0 ||
        winningScenarios.length === 0 ||
        lineup.winProbability < 0.01
          ? "miracle_route"
          : lineup.winProbability < 0.1 ||
              highestRequiredPercentile >= 0.8
            ? "narrow_route"
            : "multiple_routes";
      return {
        entryId: lineup.entryId,
        displayName: lineup.displayName,
        target:
          winningScenarios.length > 0 ? "win" : "best_simulated_finish",
        scenarioCount: routeScenarios.length,
        bestSimulatedFinish,
        plausibility,
        requiredHoleInOnes,
        keyNeeds,
      };
    },
  );

  const dependenciesByParticipant = new Map<
    string,
    { entryIds: string[]; entryNames: string[] }
  >();
  for (const route of lineupRoutes) {
    for (const need of route.keyNeeds) {
      const dependency = dependenciesByParticipant.get(
        need.eventParticipantId,
      ) ?? { entryIds: [], entryNames: [] };
      dependency.entryIds.push(route.entryId);
      dependency.entryNames.push(route.displayName);
      dependenciesByParticipant.set(need.eventParticipantId, dependency);
    }
  }
  const sharedDependencies: ContestCommentarySharedDependency[] = [
    ...dependenciesByParticipant,
  ]
    .filter(([, dependency]) => dependency.entryIds.length >= 2)
    .map(([participantId, dependency]) => ({
      eventParticipantId: participantId,
      displayName:
        stateById.get(participantId)?.participant.displayName ?? participantId,
      entryIds: dependency.entryIds,
      entryNames: dependency.entryNames,
    }))
    .sort(
      (a, b) =>
        b.entryIds.length - a.entryIds.length ||
        a.displayName.localeCompare(b.displayName),
    );

  const sharedDownsideRisks: ContestCommentarySharedDownsideRisk[] = [
    ...ownersByParticipant,
  ]
    .flatMap(([participantId, owners]) => {
      const state = stateById.get(participantId);
      if (!state || state.plans.length === 0) return [];
      const cohortOwners = [...owners].filter((entryId) =>
        contentionSet.has(entryId),
      );
      if (cohortOwners.length < 2) return [];
      const remaining = records.map(
        (record) =>
          record.remainingByParticipant.get(participantId) ?? 0,
      );
      const negativeHoleScenarios = records.filter(
        (record) =>
          (record.negativeHolesByParticipant.get(participantId) ?? 0) > 0,
      ).length;
      const medianRemaining = quantile(remaining, 0.5);
      const downsideRemaining = quantile(remaining, 0.1);
      const downsideSwing = Math.max(
        0,
        medianRemaining - downsideRemaining,
      );
      if (downsideSwing === 0 && negativeHoleScenarios === 0) return [];
      return [
        {
          eventParticipantId: participantId,
          displayName: state.participant.displayName,
          ownership: `${cohortOwners.length}/${cohortSize}`,
          ownerEntryIds: cohortOwners,
          ownerNames: cohortOwners.map(
            (entryId) =>
              entryById.get(entryId)?.displayName?.trim() || entryId,
          ),
          medianRemaining,
          downsideRemaining,
          downsideSwing,
          negativeRemainingProbability: probability(
            remaining.filter((value) => value < 0).length / records.length,
          ),
          negativeHoleProbability: probability(
            negativeHoleScenarios / records.length,
          ),
        },
      ];
    })
    .sort(
      (a, b) =>
        b.ownerEntryIds.length * b.downsideSwing -
          a.ownerEntryIds.length * a.downsideSwing ||
        b.negativeHoleProbability - a.negativeHoleProbability ||
        a.displayName.localeCompare(b.displayName),
    );

  const activePlayers: ContestCommentaryPlayer[] = decisive
    .map((player) => {
      const ownershipShare =
        cohortSize > 0 ? player.ownersCount / cohortSize : 0;
      return {
        eventParticipantId: player.eventParticipantId,
        displayName: player.displayName,
        ownership: `${player.ownersCount}/${cohortSize}`,
        ownersCount: player.ownersCount,
        cohortSize,
        ownershipShare: probability(ownershipShare),
        leverage: probability(1 - ownershipShare),
        payoutSwing: player.payoutSwing,
        holesLeft: player.holesLeft,
        ownerEntryIds: player.affectedEntryIds,
        ownerNames: player.affectedUserNames,
      };
    })
    .filter((player) => player.ownersCount > 0);

  const highLeveragePlayers = activePlayers
    .filter((player) => player.ownershipShare <= 1 / 3)
    .sort(
      (a, b) =>
        a.ownersCount - b.ownersCount ||
        b.payoutSwing - a.payoutSwing ||
        a.displayName.localeCompare(b.displayName),
    );

  const highRarityLineups: ContestCommentaryLineupRarity[] = contentionLineups
    .map((lineup) => {
      const ownedPlayers = activePlayers.filter((player) =>
        player.ownerEntryIds.includes(lineup.entryId),
      );
      const rosterSize = Math.max(
        1,
        entryById.get(lineup.entryId)?.eventParticipantIds.length ?? 0,
      );
      return {
        entryId: lineup.entryId,
        displayName: lineup.displayName,
        scoreNow: lineup.scoreNow,
        positionNow: lineup.positionNow,
        tier: lineup.tier,
        rarityScore: probability(
          (ownedPlayers.reduce((sum, player) => sum + player.leverage, 0) /
            rosterSize) *
            100,
        ),
        highLeveragePlayers: highLeveragePlayers
          .filter((player) => player.ownerEntryIds.includes(lineup.entryId))
          .map((player) => ({
            eventParticipantId: player.eventParticipantId,
            displayName: player.displayName,
            ownership: player.ownership,
          })),
      };
    })
    .sort(
      (a, b) =>
        b.rarityScore - a.rarityScore || a.positionNow - b.positionNow,
    );

  const consensusPlayers: ContestCommentaryConsensusPlayer[] = consensus
    .map((player) => ({
      eventParticipantId: player.eventParticipantId,
      displayName: player.displayName,
      ownership: player.ownership,
      ownershipShare: probability(
        player.cohortSize > 0 ? player.ownersCount / player.cohortSize : 0,
      ),
      payoutSwing: player.payoutSwing,
      consensusStrength: player.consensusStrength,
    }))
    .sort(
      (a, b) =>
        b.consensusStrength - a.consensusStrength ||
        a.payoutSwing - b.payoutSwing,
    );

  return {
    period,
    paidCount,
    eventProgress,
    race: {
      leaderScore,
      cutScore,
      contenderCount: cohortSize,
    },
    contentionLineups,
    lineupRoutes,
    sharedDependencies,
    sharedDownsideRisks,
    highLeveragePlayers,
    highRarityLineups,
    consensusPlayers,
    uncertaintyNotes: notes,
    simulation: {
      count: simulationCount,
      seed,
      popularityWeight: rules.weight,
    },
  };
}

export { scoreLineupFromTotals };
