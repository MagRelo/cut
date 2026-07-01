import { describe, expect, it } from "vitest";
import {
  COMMODITIES_LOSS_RATIO,
  mergeLockedDayClosePrices,
  pctReturnToLineupPoints,
  transformCommodityDailyScores,
} from "./daily-scores.js";
import {
  buildSessionDayCloseTimestamps,
  commoditiesActivePeriod,
  commoditiesScoringPeriod,
  DEFAULT_COMMODITIES_SESSION_CALENDAR,
  resolveSparklineSessionEnd,
} from "./session-timing.js";
import { transformCommodityDailyPrice } from "./live-scores.js";

const SESSION_OPEN = "2026-06-29T13:30:00.000Z";
const SESSION_CLOSE = "2026-07-03T20:30:00.000Z";
const TUE_OVERNIGHT = "2026-07-01T02:00:00.000Z";
const TUE_SESSION = "2026-06-30T15:00:00.000Z";

describe("pctReturnToLineupPoints", () => {
  it("scores full magnitude on gains", () => {
    expect(pctReturnToLineupPoints(2)).toBe(20);
  });

  it("dampens losses at lossRatio", () => {
    expect(pctReturnToLineupPoints(-2, 0.4)).toBe(-8);
  });

  it("scores linear cumulative % with lossRatio 1", () => {
    expect(pctReturnToLineupPoints(2.35, 1)).toBe(24);
    expect(pctReturnToLineupPoints(-1.2, 1)).toBe(-12);
  });
});

describe("mergeLockedDayClosePrices", () => {
  it("keeps settled day closes when fresh values drift", () => {
    const merged = mergeLockedDayClosePrices(
      [101.2, 102.5, 103, null, null],
      [101, 102, null, null, null],
      SESSION_OPEN,
      SESSION_CLOSE,
      false,
      new Date("2026-06-30T21:00:00.000Z"),
    );

    expect(merged).toEqual([101, 102, 103, null, null]);
  });

  it("captures the first settled close when a day has no prior lock", () => {
    const merged = mergeLockedDayClosePrices(
      [101, 102, null, null, null],
      [],
      SESSION_OPEN,
      SESSION_CLOSE,
      false,
      new Date("2026-06-30T21:00:00.000Z"),
    );
    expect(merged).toEqual([101, 102, null, null, null]);
  });

  it("locks all days once the session is complete", () => {
    const merged = mergeLockedDayClosePrices(
      [101.5, 102.5, 103.5, 104.5, 105.5],
      [101, 102, 103, 104, 105],
      SESSION_OPEN,
      SESSION_CLOSE,
      true,
      new Date(SESSION_CLOSE),
    );

    expect(merged).toEqual([101, 102, 103, 104, 105]);
  });
});

describe("session timing", () => {
  it("advances scoring to Wednesday after Tuesday close", () => {
    const overnight = new Date(TUE_OVERNIGHT);
    expect(commoditiesScoringPeriod(SESSION_OPEN, SESSION_CLOSE, overnight)).toBe(3);
    expect(commoditiesActivePeriod(SESSION_OPEN, SESSION_CLOSE, overnight)).toBe(2);
  });

  it("pins the sparkline to Tuesday close overnight", () => {
    const overnight = new Date(TUE_OVERNIGHT);
    const end = resolveSparklineSessionEnd(SESSION_OPEN, SESSION_CLOSE, overnight.getTime());
    expect(end).toEqual({ dayIndex: 1, sessionFraction: 1, includeLiveTail: false });
  });

  it("uses custom calendar close time for day boundaries", () => {
    const defaultCloses = buildSessionDayCloseTimestamps(SESSION_OPEN, SESSION_CLOSE);
    const earlyCloses = buildSessionDayCloseTimestamps(SESSION_OPEN, SESSION_CLOSE, {
      closeTime: "15:00:00",
    });

    expect(earlyCloses[0]).toBeLessThan(defaultCloses[0]!);
    expect(earlyCloses).not.toEqual(defaultCloses);
  });

  it("defaults calendar to NYSE session times", () => {
    const closes = buildSessionDayCloseTimestamps(
      SESSION_OPEN,
      SESSION_CLOSE,
      DEFAULT_COMMODITIES_SESSION_CALENDAR,
    );
    const implicit = buildSessionDayCloseTimestamps(SESSION_OPEN, SESSION_CLOSE);
    expect(closes).toEqual(implicit);
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
      currentPeriod: 5,
      sessionOpen: SESSION_OPEN,
      sessionClose: SESSION_CLOSE,
      lossRatio: COMMODITIES_LOSS_RATIO,
    });

    expect(result.rounds).toHaveLength(5);
    expect(result.rounds[0]?.total).toBe(10);
    expect(result.rounds[1]?.total).toBe(-4);
    expect(result.total).toBe(result.rounds.reduce((sum, round) => sum + round.total, 0));
  });

  it("scores Wednesday live overnight after Tuesday close", () => {
    const overnight = new Date(TUE_OVERNIGHT);
    const result = transformCommodityDailyScores({
      openPrice: 6.1715,
      dayClosePrices: [6.1765, 6.2525, null, null, null],
      currentPrice: 6.1524,
      isComplete: false,
      currentPeriod: 3,
      sessionOpen: SESSION_OPEN,
      sessionClose: SESSION_CLOSE,
      now: overnight,
    });

    expect(result.rounds[1]?.pctReturn).toBeCloseTo(1.23, 1);
    expect(result.rounds[1]?.provisional).toBe(false);
    expect(result.rounds[2]?.provisional).toBe(true);
    expect(result.rounds[2]?.pctReturn).toBeCloseTo(-1.6, 1);
  });

  it("scores the active day provisionally through the close-to-close window", () => {
    const result = transformCommodityDailyScores({
      openPrice: 100,
      dayClosePrices: [101, null, null, null, null],
      currentPrice: 100.5,
      isComplete: false,
      currentPeriod: 2,
      sessionOpen: SESSION_OPEN,
      sessionClose: SESSION_CLOSE,
      now: new Date(TUE_SESSION),
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
      currentPeriod: 5,
      sessionOpen: SESSION_OPEN,
      sessionClose: SESSION_CLOSE,
      provisional: false,
    });

    expect(result.scoreData.r1?.total).toBe(20);
    expect(result.scoreData.r2?.total).toBe(0);
    expect(result.scoreData.dayClosePrices).toEqual([102, 102, 102, 102, 102]);
    expect(result.total).toBe(20);
  });
});
