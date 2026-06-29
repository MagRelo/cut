import { describe, expect, it } from "vitest";
import { pctReturnToTotal, totalToDisplayScore, transformCommodityPrice } from "./live-scores.js";

describe("pctReturnToTotal", () => {
  it("converts +2.35% to 235", () => {
    expect(pctReturnToTotal(2.35)).toBe(235);
  });

  it("converts -1.2% to -120", () => {
    expect(pctReturnToTotal(-1.2)).toBe(-120);
  });
});

describe("totalToDisplayScore", () => {
  it("displays 235 as 23.5", () => {
    expect(totalToDisplayScore(235)).toBe(23.5);
  });
});

describe("transformCommodityPrice", () => {
  it("computes return from open to close", () => {
    const result = transformCommodityPrice({
      openPrice: 100,
      currentPrice: 102.35,
      closePrice: 102.35,
      provisional: false,
    });
    expect(result.total).toBe(235);
    expect(result.scoreData.pctReturn).toBeCloseTo(2.35, 5);
  });

  it("returns zero when open is missing", () => {
    const result = transformCommodityPrice({
      openPrice: null,
      currentPrice: 100,
      provisional: true,
    });
    expect(result.total).toBe(0);
  });
});
