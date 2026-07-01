import type { CommodityRoundScoreData, CommodityScoreData } from "./metadata.js";
import { pctReturnToLineupPoints } from "./daily-scores.js";
import {
  COMMODITIES_LOSS_RATIO,
  transformCommodityDailyScores,
  type CommodityDailyScoreInput,
  type CommodityRoundScore,
} from "./daily-scores.js";
import { commoditiesScoringPeriod } from "./session-timing.js";

export {
  COMMODITIES_LOSS_RATIO,
  COMMODITIES_ROUND_COUNT,
  asymmetricPctToTotal,
  mergeLockedDayClosePrices,
  pctReturnToLineupPoints,
  transformCommodityDailyScores,
  type CommodityDailyScoreInput,
  type CommodityRoundScore,
} from "./daily-scores.js";
export {
  buildSessionDayCloseTimestamps,
  buildSessionDayOpenTimestamps,
  commoditiesActivePeriod,
  commoditiesScoringPeriod,
  commoditiesSettledDayCount,
  isCommoditiesPeriodInSession,
  resolveSparklineSessionEnd,
  tradingSessionParts,
  type SparklineSessionEnd,
} from "./session-timing.js";

/** @deprecated Use pctReturnToLineupPoints */
export function pctReturnToTotal(pctReturn: number): number {
  return pctReturnToLineupPoints(pctReturn, 1);
}

export interface CommodityPriceInput {
  openPrice: number | null | undefined;
  currentPrice: number | null | undefined;
  closePrice?: number | null;
  provisional: boolean;
}

export interface CommodityDailyPriceInput extends CommodityDailyScoreInput {
  provisional: boolean;
}

export interface CommodityParticipantScoreUpdate {
  total: number;
  scoreData: CommodityScoreData;
}

function roundToScoreData(round: CommodityRoundScore): CommodityRoundScoreData {
  return {
    total: round.total,
    pctReturn: round.pctReturn ?? null,
    provisional: round.provisional ?? false,
  };
}

/** Five daily rounds with asymmetric scoring (losses × lossRatio). */
export function transformCommodityDailyPrice(
  input: CommodityDailyPriceInput,
): CommodityParticipantScoreUpdate {
  const now = input.now ?? new Date();
  const currentPeriod =
    input.sessionOpen && input.sessionClose
      ? commoditiesScoringPeriod(input.sessionOpen, input.sessionClose, now)
      : input.currentPeriod;
  const { total, rounds, cumulativePctReturn } = transformCommodityDailyScores({
    ...input,
    currentPeriod,
    now,
  });
  const lossRatio = input.lossRatio ?? COMMODITIES_LOSS_RATIO;

  return {
    total,
    scoreData: {
      openPrice: input.openPrice ?? null,
      currentPrice: input.currentPrice ?? null,
      closePrice: input.closePrice ?? null,
      pctReturn: cumulativePctReturn,
      provisional: input.provisional,
      lossRatio,
      currentPeriod,
      dayClosePrices: input.dayClosePrices.map((price) => price ?? null),
      r1: roundToScoreData(rounds[0]!),
      r2: roundToScoreData(rounds[1]!),
      r3: roundToScoreData(rounds[2]!),
      r4: roundToScoreData(rounds[3]!),
      r5: roundToScoreData(rounds[4]!),
    },
  };
}

/** Linear cumulative % scoring — used by legacy scripts only. */
export function transformCommodityPrice(
  input: CommodityPriceInput,
): CommodityParticipantScoreUpdate {
  const openPrice = input.openPrice ?? null;
  const currentPrice = input.currentPrice ?? null;
  const closePrice = input.closePrice ?? null;
  const effectivePrice = closePrice ?? currentPrice;

  if (openPrice == null || openPrice <= 0 || effectivePrice == null || effectivePrice <= 0) {
    return {
      total: 0,
      scoreData: {
        openPrice,
        currentPrice,
        closePrice,
        pctReturn: 0,
        provisional: input.provisional,
      },
    };
  }

  const pctReturn = ((effectivePrice - openPrice) / openPrice) * 100;
  const total = pctReturnToLineupPoints(pctReturn, 1);

  return {
    total,
    scoreData: {
      openPrice,
      currentPrice,
      closePrice,
      pctReturn,
      provisional: input.provisional,
    },
  };
}
