import { describe, expect, it } from "vitest";
import {
  asymmetricPctToTotal,
  COMMODITIES_LOSS_RATIO,
  transformCommodityDailyScores,
} from "./daily-scores.js";
import { transformCommodityDailyPrice } from "./live-scores.js";

describe("pctReturnToLineupPoints (asymmetricPctToTotal)", () => {
  it("scores full magnitude on gains", () => {
    expect(asymmetricPctToTotal(2)).toBe(20);
  });

  it("dampens losses at lossRatio", () => {
    expect(asymmetricPctToTotal(-2, 0.4)).toBe(-8);
  });
});

describe("transformCommodityDailyScores", () => {
  it("sums five daily rounds with asymmetric loss on down days", () => {
    const result = transformCommodityDailyScores({
      openPrice: 100,
      dayClosePrices: [101, 100, 102, 101.5, 103],
      currentPrice: 103,
      closePrice: 103,
      isComplete: true,
      currentRound: 5,
      lossRatio: COMMODITIES_LOSS_RATIO,
    });

    expect(result.rounds).toHaveLength(5);
    expect(result.rounds[0]?.total).toBe(10); // +1%
    expect(result.rounds[1]?.total).toBe(-4); // -1% × 0.4
    expect(result.total).toBe(result.rounds.reduce((sum, round) => sum + round.total, 0));
  });

  it("scores only completed rounds before session end", () => {
    const result = transformCommodityDailyScores({
      openPrice: 100,
      dayClosePrices: [101, null, null, null, null],
      currentPrice: 100.5,
      isComplete: false,
      currentRound: 2,
    });

    expect(result.rounds[0]?.provisional).toBe(false);
    expect(result.rounds[1]?.provisional).toBe(true);
    expect(result.rounds[2]?.total).toBe(0);
    expect(result.rounds[3]?.total).toBe(0);
    expect(result.rounds[4]?.total).toBe(0);
  });
});

describe("transformCommodityDailyPrice", () => {
  it("persists round breakdown on scoreData", () => {
    const result = transformCommodityDailyPrice({
      openPrice: 100,
      dayClosePrices: [102, 102, 102, 102, 102],
      currentPrice: 102,
      closePrice: 102,
      isComplete: true,
      currentRound: 5,
      provisional: false,
    });

    expect(result.scoreData.r1?.total).toBe(20);
    expect(result.scoreData.r2?.total).toBe(0);
    expect(result.total).toBe(20);
  });
});
