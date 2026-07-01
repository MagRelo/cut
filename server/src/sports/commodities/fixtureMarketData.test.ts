import { describe, expect, it } from "vitest";
import {
  fixtureCandlesForWindow,
  fixtureMarkPrice,
  fixturePriceHistory,
  fixtureQuoteForTicker,
} from "./fixtureMarketData.js";

describe("fixtureMarketData", () => {
  it("is deterministic for a ticker", () => {
    expect(fixtureMarkPrice("GOLD")).toBe(fixtureMarkPrice("GOLD"));
  });

  it("builds quote and session candles for HL tickers", () => {
    const quote = fixtureQuoteForTicker("GOLD");
    expect(quote.markPrice).toBeGreaterThan(0);
    expect(fixturePriceHistory("GOLD")).toHaveLength(30);

    const open = Date.parse("2026-06-30T14:00:00.000Z");
    const close = Date.parse("2026-06-30T16:00:00.000Z");
    const candles = fixtureCandlesForWindow("GOLD", open, close, "1m");
    expect(candles.length).toBeGreaterThan(0);
  });
});
