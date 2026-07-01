export { COMMODITIES_PERIOD_RULES } from "./periods.js";

export {
  COMMODITIES_SPORT_ID,
  parseCommoditiesEventMetadata,
  getEventFieldSnapshot,
  type CommoditiesEventMetadata,
  type CommodityFieldEntry,
  type CommodityParticipantMetadata,
  type CommodityPriceHistoryPoint,
  type CommodityQuoteSnapshot,
  type CommodityRoundScoreData,
  type CommodityScoreData,
  type CommoditySector,
} from "./metadata.js";

export {
  COMMODITY_METADATA_ALLOWLIST,
  COMMODITY_SECTORS,
  COMMODITY_SYNONYM_TO_CANONICAL,
  DEX_PRIORITY,
  EXCLUDED_HL_TICKERS,
  catalogEntryToFieldEntry,
  commodityExternalId,
  findAllowlistEntry,
  type CommodityCatalogEntry,
  type CommodityMetadataAllowlistEntry,
} from "./catalog.js";

export {
  commoditiesEventStatus,
  commoditiesEventStatusFromMetadata,
  commoditiesShouldActivateContest,
  commoditiesShouldSettleContest,
  commoditiesShouldSyncLiveScores,
} from "./status.js";

export { validateCommoditiesRoster } from "./validation.js";
export {
  rankCommoditiesEntries,
  getContestWinningScore,
  tiebreakerDistance,
} from "./ranking.js";
export { buildCommoditiesCandidates, type EventParticipantRow } from "./candidates.js";
export { commoditiesCandidateSortConfig } from "./candidateSort.js";
export {
  buildCommoditiesSortKeys,
  commoditiesCandidateHasDisplayName,
  COMMODITIES_MISSING_RANK,
} from "./commoditiesSortKeys.js";

export {
  COMMODITIES_LOSS_RATIO,
  COMMODITIES_ROUND_COUNT,
  pctReturnToLineupPoints,
  pctReturnToTotal,
  transformCommodityDailyPrice,
  transformCommodityDailyScores,
  transformCommodityPrice,
  mergeLockedDayClosePrices,
  asymmetricPctToTotal,
  commoditiesActivePeriod,
  commoditiesScoringPeriod,
  commoditiesSettledDayCount,
  isCommoditiesPeriodInSession,
  resolveSparklineSessionEnd,
  buildSessionDayCloseTimestamps,
  buildSessionDayOpenTimestamps,
  tradingSessionParts,
  type CommodityDailyPriceInput,
  type CommodityDailyScoreInput,
  type CommodityParticipantScoreUpdate,
  type CommodityPriceInput,
  type CommodityRoundScore,
  type SparklineSessionEnd,
} from "./live-scores.js";

export { createCommoditiesModule, type CommoditiesHandlers } from "./create-module.js";
