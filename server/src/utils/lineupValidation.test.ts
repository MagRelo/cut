import { describe, expect, it } from "vitest";
import { isRosterPredictionDuplicate, normalizePlayerSet } from "./lineupValidation.js";

describe("normalizePlayerSet", () => {
  it("treats player order as identical", () => {
    expect(normalizePlayerSet(["b", "a"])).toBe(normalizePlayerSet(["a", "b"]));
  });
});

describe("isRosterPredictionDuplicate", () => {
  const roster = ["p1", "p2", "p3", "p4"];

  it("blocks same players with same prediction", () => {
    expect(isRosterPredictionDuplicate(roster, 142, [...roster].reverse(), 142)).toBe(true);
  });

  it("allows same players with different prediction", () => {
    expect(isRosterPredictionDuplicate(roster, 142, roster, 143)).toBe(false);
  });

  it("never duplicates empty rosters", () => {
    expect(isRosterPredictionDuplicate([], 150, [], 150)).toBe(false);
  });
});
