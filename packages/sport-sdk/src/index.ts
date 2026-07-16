export type {
  Candidate,
  CompetitionEventShell,
  EventStatus,
  LineupEntryInput,
  LineupPickShell,
  MarketSnapshot,
  PayoutVector,
  PopularityMode,
  PopularityRules,
  PredictionRules,
  PropBetGrade,
  PropBetResultsShell,
  PropBetTicketShell,
  RankedEntry,
  RosterRules,
  ScoringAggregation,
  ScoringDirection,
  ScoringRules,
  SportSummary,
  ValidationResult,
  PeriodRules,
} from "./types.js";

export {
  formatPeriodLabel,
  isTimelinePeriod,
  periodRulesHasDividers,
} from "./periods.js";

export {
  mergeEventPeriodFields,
  mergeScoreDataPeriodFields,
  readCurrentPeriod,
  readPeriodDisplay,
  readPeriodStatusDisplay,
  readScoreDataCurrentPeriod,
  stripLegacyPeriodFields,
  type EventPeriodPatch,
} from "./eventPeriod.js";

export {
  defaultLineupPredictionForLineupId,
  defaultLineupPredictionMidpoint,
  isValidLineupPrediction,
  LINEUP_PREDICTION_TYPE,
  parseLineupPrediction,
  randomLineupPrediction,
  toLineupPrediction,
  type LineupPrediction,
} from "./lineupPrediction.js";

export type { SportModule } from "./sport-module.js";
export type { PropBetModule } from "./prop-bet-module.js";

export { defaultPayoutVector } from "./payout.js";

export type {
  AdjustedPickScore,
  NormalizedPopularityRules,
  PickPopularityEntry,
  PickPopularityMap,
} from "./popularity.js";
export {
  adjustPickScore,
  buildPickPopularityMap,
  computePickRates,
  DEFAULT_POPULARITY_CAP,
  DEFAULT_POPULARITY_MIN_ENTRY_FLOOR,
  DEFAULT_POPULARITY_MODE,
  DEFAULT_POPULARITY_STRENGTH,
  normalizePopularityRules,
  sumLineupScores,
} from "./popularity.js";

export type {
  CandidateSortConfig,
  CandidateSortContext,
  CandidateSortContextDef,
  CandidateSortKeyDef,
  SortCandidatesOptions,
  SortDirection,
} from "./candidateSort.js";
export { compareCandidates, sortCandidates } from "./candidateSort.js";
