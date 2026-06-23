export type {
  Candidate,
  CompetitionEventShell,
  EventStatus,
  LineupEntryInput,
  LineupPickShell,
  MarketSnapshot,
  PayoutVector,
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
} from "./types.js";

export type { SportModule } from "./sport-module.js";
export type { PropBetModule } from "./prop-bet-module.js";

export { defaultPayoutVector } from "./payout.js";

export type {
  CandidateSortConfig,
  CandidateSortContext,
  CandidateSortContextDef,
  CandidateSortKeyDef,
  SortCandidatesOptions,
  SortDirection,
} from "./candidateSort.js";
export { compareCandidates, sortCandidates } from "./candidateSort.js";
