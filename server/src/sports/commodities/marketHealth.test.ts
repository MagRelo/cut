import { afterEach, describe, expect, it } from "vitest";
import type { HlAssetWithContext } from "./hyperliquidClient.js";
import {
  assessAssetLiquidity,
  minDayVolumeThreshold,
  minOpenInterestThreshold,
} from "./marketHealth.js";

function mockAsset(dayVolume: number, openInterest: string): HlAssetWithContext {
  return {
    hlCoin: "xyz:GOLD",
    hlDex: "xyz",
    ticker: "GOLD",
    context: {
      markPx: "100",
      oraclePx: "100",
      prevDayPx: "99",
      dayNtlVlm: String(dayVolume),
      dayBaseVlm: "0",
      funding: "0",
      openInterest,
      premium: null,
      midPx: "100",
      impactPxs: null,
    },
  };
}

describe("marketHealth", () => {
  afterEach(() => {
    delete process.env.COMMODITIES_MIN_DAY_VOLUME;
    delete process.env.COMMODITIES_MIN_OPEN_INTEREST;
  });

  it("passes liquid markets", () => {
    const result = assessAssetLiquidity(mockAsset(1_000_000, "5000"));
    expect(result.healthy).toBe(true);
  });

  it("rejects low day volume", () => {
    const result = assessAssetLiquidity(mockAsset(10, "5000"));
    expect(result.healthy).toBe(false);
    expect(result.reason).toBe("low_day_volume");
  });

  it("rejects low open interest", () => {
    const result = assessAssetLiquidity(mockAsset(1_000_000, "0"));
    expect(result.healthy).toBe(false);
    expect(result.reason).toBe("low_open_interest");
  });

  it("reads thresholds from env", () => {
    process.env.COMMODITIES_MIN_DAY_VOLUME = "500000";
    process.env.COMMODITIES_MIN_OPEN_INTEREST = "1000";
    expect(minDayVolumeThreshold()).toBe(500_000);
    expect(minOpenInterestThreshold()).toBe(1000);
  });
});
