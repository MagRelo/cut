import type { CommodityRoundScoreData, CommodityScoreData } from "./metadata.js";
import {
  COMMODITIES_LOSS_RATIO,
  transformCommodityDailyScores,
  type CommodityDailyScoreInput,
  type CommodityRoundScore,
} from "./daily-scores.js";
import { commoditiesScoringPeriod, resolveCommoditiesSessionBounds } from "./session-timing.js";

export {
  COMMODITIES_LOSS_RATIO,
  COMMODITIES_ROUND_COUNT,
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
  commoditiesCalendarPeriod,
  commoditiesScoringPeriod,
  commoditiesSettledDayCount,
  DEFAULT_COMMODITIES_SESSION_CALENDAR,
  firstScorablePeriod,
  isCommoditiesPeriodInSession,
  isCommoditiesPeriodScorable,
  resolveCommoditiesSessionBounds,
  resolveSessionCalendar,
  resolveSparklineSessionEnd,
  tradingSessionParts,
  type CommoditiesSessionBounds,
  type CommoditiesSessionCalendar,
  type SparklineSessionEnd,
} from "./session-timing.js";

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

function resolveCurrentPeriod(input: CommodityDailyPriceInput, now: Date): number {
  if (input.sessionOpen && input.sessionClose) {
    return commoditiesScoringPeriod(
      resolveCommoditiesSessionBounds({
        sessionDate: input.sessionDate,
        sessionOpen: input.sessionOpen,
        sessionClose: input.sessionClose,
        calendar: input.calendar,
      }),
      now,
    );
  }
  if (input.currentPeriod != null) {
    return input.currentPeriod;
  }
  return 1;
}

/** Five daily rounds with asymmetric scoring (losses × lossRatio). */
export function transformCommodityDailyPrice(
  input: CommodityDailyPriceInput,
): CommodityParticipantScoreUpdate {
  const now = input.now ?? new Date();
  const currentPeriod = resolveCurrentPeriod(input, now);
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
