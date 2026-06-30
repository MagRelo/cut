import { describe, expect, it } from "vitest";
import {
  candleFetchWindow,
  resolvePriceAtTimestamp,
  selectCandleInterval,
  type CandleInterval,
} from "./sessionPricing.js";
import type { CandleInterval } from "./sessionPricing.js";

function candle(t: number, close: string) {
  return { t, c: close };
}

describe("sessionPricing", () => {
  it("selects 1m for short sessions", () => {
    const open = Date.parse("2026-06-30T14:00:00.000Z");
    const close = Date.parse("2026-06-30T15:00:00.000Z");
    expect(selectCandleInterval(open, close)).toBe("1m");
  });

  it("selects coarser intervals for long sessions", () => {
    const open = Date.parse("2026-01-01T00:00:00.000Z");
    const close = Date.parse("2026-02-01T00:00:00.000Z");
    const interval = selectCandleInterval(open, close);
    expect(["15m", "1h", "4h"]).toContain(interval);
  });

  it("resolves price at timestamp from prior candle close", () => {
    const candles = [candle(1000, "100"), candle(2000, "110"), candle(3000, "120")];
    expect(resolvePriceAtTimestamp(candles, 2500)).toBe(110);
    expect(resolvePriceAtTimestamp(candles, 1000)).toBe(100);
  });

  it("pads candle fetch window", () => {
    const open = 10_000;
    const close = 20_000;
    const interval = "5m" as CandleInterval;
    const window = candleFetchWindow(open, close, interval);
    expect(window.startMs).toBeLessThan(open);
    expect(window.endMs).toBeGreaterThan(close);
  });
});
