export { PGA_GOLF_PERIOD_RULES } from "./periods.js";

export {
  PGA_GOLF_SPORT_ID,
  parseGolfEventMetadata,
  type GolfEventMetadata,
  type GolfParticipantMetadata,
  type GolfScoreData,
} from "./metadata.js";

export {
  golfEventStatus,
  golfEventStatusFromMetadata,
  golfShouldActivateContest,
  golfShouldSettleContest,
  golfShouldSyncLiveScores,
  isGolfEventCompleteRaw,
  isGolfEventLiveRaw,
} from "./status.js";

export { validateGolfRoster } from "./validation.js";
export { rankGolfEntries, getContestWinningScore, tiebreakerDistance } from "./ranking.js";
export { buildGolfCandidates, type EventParticipantRow } from "./candidates.js";
export { golfCandidateSortConfig } from "./candidateSort.js";
export {
  buildGolfSortKeys,
  golfCandidateHasDisplayName,
  golfLeaderboardPositionSortKey,
  golfLeaderboardScoreSortKey,
  GOLF_LEADERBOARD_SORT_BUCKET,
  GOLF_MISSING_POSITION,
  GOLF_MISSING_RANK,
} from "./golfSortKeys.js";

export {
  applyGolfRoundIcons,
  cutBonus,
  formatHolesFromRoundScores,
  positionBonus,
  transformGolfParticipantScores,
  type GolfFormattedHoles,
  type GolfLeaderboardRowInput,
  type GolfParticipantScoreUpdate,
  type GolfRoundIconConfig,
  type GolfRoundScoreUpdate,
  type GolfScorecardInput,
} from "./live-scores.js";

export {
  createPgaGolfModule,
  golfShouldActivateFromMetadata,
  golfShouldSettleFromMetadata,
  type PgaGolfHandlers,
} from "./create-module.js";

export {
  createPgaGolfPropBetModule,
  type PgaGolfPropBetHandlers,
} from "./create-prop-bet-module.js";

export {
  isGolfFinishInTopN,
  gradeGolfPropTicket,
  type GolfPropBetMarketMetadata,
  type GolfPropBetResultsMetadata,
  type GolfPropBetSelection,
  type GolfPropBetTicketMetadata,
} from "./prop-bet.js";

export {
  DEFAULT_CUTBOT_ATTRIBUTION,
  DEFAULT_QUOTE_COLOR,
  findQuotesSection,
  getNormalizedQuotes,
  isQuotesSection,
  isSummaryLeadSection,
  normalizeHexColor,
  normalizeQuoteItem,
  parseSummarySections,
  quoteColorsFromHex,
  QUOTES_SECTION_DISPLAY_TITLE,
  type NormalizedTournamentQuote,
  type QuoteBlockColors,
  type TournamentSummaryItem,
  type TournamentSummarySection,
  type TournamentSummarySections,
} from "./tournamentSummary.js";
