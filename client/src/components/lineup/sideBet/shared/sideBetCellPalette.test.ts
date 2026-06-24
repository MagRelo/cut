import { describe, expect, it } from "vitest";
import {
  impliedProbabilityFromDecimalOdds,
  sideBetCellOddsTier,
} from "./sideBetCellPalette";

describe("sideBetCellPalette", () => {
  it("maps implied probability to tiers", () => {
    expect(sideBetCellOddsTier(1.15)).toBe("favorite");
    expect(sideBetCellOddsTier(2.5)).toBe("lean");
    expect(sideBetCellOddsTier(4)).toBe("fair");
    expect(sideBetCellOddsTier(10)).toBe("long");
    expect(sideBetCellOddsTier(72.5)).toBe("moonshot");
  });

  it("computes implied probability from decimal odds", () => {
    expect(impliedProbabilityFromDecimalOdds(2)).toBeCloseTo(0.5);
    expect(impliedProbabilityFromDecimalOdds(1)).toBeNull();
  });
});
