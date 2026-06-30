import { describe, expect, it } from "vitest";
import {
  fixtureDailyBar,
  fixturePriceHistory,
  fixtureQuote,
  getFixtureSessionSnapshots,
} from "./fixtureMarketData.js";

describe("fixtureMarketData", () => {
  it("is deterministic for a symbol and session date", () => {
    expect(fixtureDailyBar("HE=F", "2025-06-27")).toEqual(fixtureDailyBar("HE=F", "2025-06-27"));
  });

  it("builds quote and bar snapshots for all requested symbols", () => {
    const snapshots = getFixtureSessionSnapshots(["HE=F", "GC=F"], "2026-06-30");
    expect(snapshots.size).toBe(2);
    expect(fixtureQuote("HE=F", "2026-06-30").regularMarketPrice).toBeGreaterThan(0);
    expect(fixturePriceHistory("HE=F")).toHaveLength(30);
  });
});
