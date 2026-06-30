import { describe, expect, it } from "vitest";
import { pctReturnToTotal, transformCommodityPrice } from "./live-scores.js";

describe("pctReturnToTotal", () => {
  it("converts +2.35% to 24 lineup points", () => {
    expect(pctReturnToTotal(2.35)).toBe(24);
  });

  it("converts -1.2% to -12 lineup points", () => {
    expect(pctReturnToTotal(-1.2)).toBe(-12);
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
    expect(result.total).toBe(Math.round(result.scoreData.pctReturn! * 10));
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
