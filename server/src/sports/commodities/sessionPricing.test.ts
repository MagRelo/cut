import { afterEach, describe, expect, it } from "vitest";
import { selectCandleInterval, sessionCandleIntervals } from "./sessionPricing.js";
import { resolveWeeklySessionBounds } from "./sessionConfig.js";

describe("selectCandleInterval for weekly session", () => {
  afterEach(() => {
    delete process.env.COMMODITIES_SESSION_TZ;
    delete process.env.COMMODITIES_SESSION_OPEN;
    delete process.env.COMMODITIES_SESSION_CLOSE;
  });

  it("uses 5m candles for Mon–Fri week window (finest under HL cap)", () => {
    process.env.COMMODITIES_SESSION_TZ = "America/New_York";
    process.env.COMMODITIES_SESSION_OPEN = "09:30";
    process.env.COMMODITIES_SESSION_CLOSE = "16:30";

    const bounds = resolveWeeklySessionBounds("2026-W27");
    const openMs = new Date(bounds.sessionOpen).getTime();
    const closeMs = new Date(bounds.sessionClose).getTime();

    expect(selectCandleInterval(openMs, closeMs)).toBe("5m");
  });

  it("falls back to coarser intervals when finer history is unavailable", () => {
    process.env.COMMODITIES_SESSION_TZ = "America/New_York";
    process.env.COMMODITIES_SESSION_OPEN = "09:30";
    process.env.COMMODITIES_SESSION_CLOSE = "16:30";

    const bounds = resolveWeeklySessionBounds("2026-W27");
    const openMs = new Date(bounds.sessionOpen).getTime();
    const closeMs = new Date(bounds.sessionClose).getTime();

    expect(sessionCandleIntervals(openMs, closeMs)).toEqual(["5m", "15m", "1h", "4h"]);
  });
});
