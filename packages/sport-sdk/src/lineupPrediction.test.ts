import { describe, expect, it } from "vitest";
import {
  defaultLineupPredictionForLineupId,
  defaultLineupPredictionMidpoint,
  isValidLineupPrediction,
  LINEUP_PREDICTION_TYPE,
  parseLineupPrediction,
  randomLineupPrediction,
  toLineupPrediction,
  type PredictionRules,
} from "./lineupPrediction.js";

const golfRules: PredictionRules = {
  min: 1,
  max: 250,
  defaultRandomMin: 95,
  defaultRandomMax: 145,
};

const f1Rules: PredictionRules = {
  min: 1,
  max: 120,
  defaultRandomMin: 45,
  defaultRandomMax: 75,
};

describe("parseLineupPrediction", () => {
  it("parses canonical shape", () => {
    expect(parseLineupPrediction({ type: LINEUP_PREDICTION_TYPE, value: 118 })).toBe(118);
  });

  it("rejects legacy and invalid shapes", () => {
    expect(parseLineupPrediction({ type: "winningScore", value: 118 })).toBeNull();
    expect(parseLineupPrediction({ type: "winningLineupPoints", value: 70 })).toBeNull();
    expect(parseLineupPrediction(null)).toBeNull();
    expect(parseLineupPrediction({ type: LINEUP_PREDICTION_TYPE, value: "118" })).toBeNull();
  });
});

describe("toLineupPrediction", () => {
  it("serializes numeric value", () => {
    expect(toLineupPrediction(70)).toEqual({ type: LINEUP_PREDICTION_TYPE, value: 70 });
  });

  it("returns null for nullish input", () => {
    expect(toLineupPrediction(null)).toBeNull();
    expect(toLineupPrediction(undefined)).toBeNull();
  });
});

describe("isValidLineupPrediction", () => {
  it("validates against sport rules", () => {
    expect(isValidLineupPrediction(118, golfRules)).toBe(true);
    expect(isValidLineupPrediction(251, golfRules)).toBe(false);
    expect(isValidLineupPrediction(70, f1Rules)).toBe(true);
    expect(isValidLineupPrediction(121, f1Rules)).toBe(false);
    expect(isValidLineupPrediction(70.5, f1Rules)).toBe(false);
  });
});

describe("randomLineupPrediction", () => {
  it("stays within default random range", () => {
    for (let i = 0; i < 50; i++) {
      const value = randomLineupPrediction(golfRules);
      expect(value).toBeGreaterThanOrEqual(golfRules.defaultRandomMin);
      expect(value).toBeLessThanOrEqual(golfRules.defaultRandomMax);
    }
  });
});

describe("defaultLineupPredictionForLineupId", () => {
  it("is deterministic for the same lineup id", () => {
    const a = defaultLineupPredictionForLineupId("lineup-abc", f1Rules);
    const b = defaultLineupPredictionForLineupId("lineup-abc", f1Rules);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(f1Rules.defaultRandomMin);
    expect(a).toBeLessThanOrEqual(f1Rules.defaultRandomMax);
  });
});

describe("defaultLineupPredictionMidpoint", () => {
  it("returns rounded midpoint of min and max", () => {
    expect(defaultLineupPredictionMidpoint(golfRules)).toBe(126);
    expect(defaultLineupPredictionMidpoint(f1Rules)).toBe(61);
  });
});
