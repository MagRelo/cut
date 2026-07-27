import { describe, expect, it } from "vitest";
import {
  needsCommoditiesDayOverview,
  settledDayCloseAt,
} from "./refreshCommoditiesContestOverviews.js";

describe("needsCommoditiesDayOverview", () => {
  it("skips when no day has settled", () => {
    expect(
      needsCommoditiesDayOverview({
        settledPeriod: 0,
        commentary: null,
        commentaryGeneratedAt: null,
        settledDayClose: null,
      }),
    ).toBe(false);
  });

  it("requires commentary after a settled day", () => {
    const close = new Date("2026-06-30T20:30:00.000Z");
    expect(
      needsCommoditiesDayOverview({
        settledPeriod: 1,
        commentary: null,
        commentaryGeneratedAt: null,
        settledDayClose: close,
      }),
    ).toBe(true);
  });

  it("skips when commentary was generated after the settled day close", () => {
    const close = new Date("2026-06-30T20:30:00.000Z");
    expect(
      needsCommoditiesDayOverview({
        settledPeriod: 1,
        commentary: "Day one recap",
        commentaryGeneratedAt: new Date("2026-06-30T21:00:00.000Z"),
        settledDayClose: close,
      }),
    ).toBe(false);
  });

  it("refreshes when a newer day has settled", () => {
    const tueClose = new Date("2026-07-01T20:30:00.000Z");
    expect(
      needsCommoditiesDayOverview({
        settledPeriod: 2,
        commentary: "Day one recap",
        commentaryGeneratedAt: new Date("2026-06-30T21:00:00.000Z"),
        settledDayClose: tueClose,
      }),
    ).toBe(true);
  });
});

describe("settledDayCloseAt", () => {
  it("returns the session day close for the settled period", () => {
    const close = settledDayCloseAt(
      {
        commodities: {
          sessionDate: "2026-06-29",
          sessionOpen: "2026-06-29T13:30:00.000Z",
          sessionClose: "2026-07-03T20:30:00.000Z",
          calendar: {
            timezone: "America/New_York",
            openTime: "09:30:00",
            closeTime: "16:30:00",
          },
        },
      },
      1,
    );
    expect(close).toBeInstanceOf(Date);
    // Monday 16:30 America/New_York for sessionDate 2026-06-29
    expect(close!.toISOString()).toBe("2026-06-29T20:30:00.000Z");
  });
});
