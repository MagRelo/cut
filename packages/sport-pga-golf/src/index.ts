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
export {
  buildGenericScoringModel,
  createSeededRandom,
  extractGenericHoleOutcomes,
  quantile,
  remainingRoundPlan,
  sampleGenericHole,
  sampleRoundPlan,
  type GenericHoleOutcome,
  type GenericScoringModel,
  type RemainingRoundPlan,
  type SampledGolfOutcome,
} from "./genericProjection.js";
export {
  analyzeContestCommentary,
  scoreLineupFromTotals,
  resolveCommentaryStage,
  type AnalyzeContestCommentaryInput,
  type ContestCommentaryConsensusPlayer,
  type ContestCommentaryContext,
  type ContestCommentaryAnalysisOptions,
  type ContestCommentaryEntry,
  type ContestCommentaryEventProgress,
  type ContestCommentaryLeaderPace,
  type ContestCommentaryLeaderProgress,
  type ContestCommentaryLineup,
  type ContestCommentaryLineupRoute,
  type ContestCommentaryLineupRarity,
  type ContestCommentaryParticipant,
  type ContestCommentaryPlayer,
  type ContestCommentaryRouteNeed,
  type ContestCommentaryRoutePlausibility,
  type ContestCommentarySharedDependency,
  type ContestCommentarySharedDownsideRisk,
  type ContestCommentaryStageId,
  type LineupOutlookTier,
} from "./contestCommentary.js";
export {
  buildPgaContestCommentaryPrompt,
  buildPgaContestFeedPrompt,
  type BuildPgaContestCommentaryPromptOptions,
  type BuildPgaContestFeedPromptOptions,
} from "./contestCommentaryPrompt.js";
export {
  CONTEST_FEED_ACTIVE_STORY_TYPES,
  CONTEST_FEED_ITEM_CAP,
  CONTEST_FEED_MAX_PER_PASS,
  CONTEST_FEED_RECAP_COOLDOWN_MS,
  CONTEST_FEED_WORD_LIMITS,
  buildContestFeedFactPack,
  buildContestFeedItemId,
  classifyContestFeedStories,
  computeContestFeedDelta,
  emptyContestCommentaryFeedDocument,
  latestFeedCommentaryText,
  mergeContestFeedItems,
  parseContestCommentaryFeedDocument,
  type ClassifyContestFeedStoriesOptions,
  type ContestCommentaryFeedDocument,
  type ContestFeedActiveStoryType,
  type ContestFeedDelta,
  type ContestFeedFactPack,
  type ContestFeedItem,
  type ContestFeedItemSubjects,
  type ContestFeedLeverageSpike,
  type ContestFeedRacePositionChange,
  type ContestFeedStoryCandidate,
  type ContestFeedStoryType,
  type ContestFeedWordLimits,
  type MergeContestFeedItemsOptions,
} from "./contestFeed.js";
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
  EVENT_BLURB_SECTION_TITLE,
  findEventBlurbSection,
  findHistorySection,
  findQuotesSection,
  formatEventCourseLine,
  formatEventPlace,
  getEventBlurb,
  getHistoryDescription,
  getNormalizedQuotes,
  isEventBlurbSection,
  isHistorySection,
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
