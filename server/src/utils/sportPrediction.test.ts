import { beforeEach, describe, expect, it, vi } from "vitest";
import { LINEUP_PREDICTION_TYPE } from "@cut/sport-sdk";

const { findUniqueOrThrow } = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    sport: { findUniqueOrThrow },
  },
}));

import { resolveLineupPredictionForWrite } from "./sportPrediction.js";

const golfRules = {
  min: 1,
  max: 250,
  defaultRandomMin: 95,
  defaultRandomMax: 145,
};

describe("resolveLineupPredictionForWrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueOrThrow.mockResolvedValue({ predictionRules: golfRules });
  });

  it("canonicalizes a valid prediction and drops extra keys", async () => {
    const result = await resolveLineupPredictionForWrite("pga-golf", {
      type: LINEUP_PREDICTION_TYPE,
      value: 118,
      extra: "nope",
    });
    expect(result).toEqual({
      ok: true,
      prediction: { type: LINEUP_PREDICTION_TYPE, value: 118 },
    });
  });

  it("rejects an out-of-range value", async () => {
    const result = await resolveLineupPredictionForWrite("pga-golf", {
      type: LINEUP_PREDICTION_TYPE,
      value: 251,
    });
    expect(result).toEqual({ ok: false, error: "invalid_prediction" });
  });

  it("defaults when prediction is omitted", async () => {
    const result = await resolveLineupPredictionForWrite("pga-golf", undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prediction = result.prediction as { type: string; value: number };
      expect(prediction.type).toBe(LINEUP_PREDICTION_TYPE);
      expect(prediction.value).toBeGreaterThanOrEqual(golfRules.defaultRandomMin);
      expect(prediction.value).toBeLessThanOrEqual(golfRules.defaultRandomMax);
    }
  });
});
