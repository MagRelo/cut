import { describe, expect, it } from "vitest";
import {
  buildGenericScoringModel,
  createSeededRandom,
  extractGenericHoleOutcomes,
  remainingRoundPlan,
  sampleRoundPlan,
} from "./genericProjection.js";

function round(
  roundNumber: number,
  stableford: Array<number | null>,
  pars = Array(18).fill(4),
) {
  return {
    holes: {
      round: roundNumber,
      par: pars,
      scores: stableford.map((points, index) =>
        points === null ? null : pars[index] - (points === 2 ? 1 : 0),
      ),
      stableford,
      total: 0,
    },
    total: stableford.reduce<number>((sum, value) => sum + (value ?? 0), 0),
    ratio: stableford.filter((value) => value !== null).length / 18,
    icon: "",
  };
}

describe("generic golf projection", () => {
  it("extracts paired outcomes by par", () => {
    const outcomes = extractGenericHoleOutcomes([
      {
        r1: {
          holes: {
            par: [3, 4, 5],
            scores: [3, 3, 7],
            stableford: [0, 2, -3],
          },
        },
      },
    ]);

    expect(outcomes).toEqual([
      { par: 3, stableford: 0, strokesToPar: 0 },
      { par: 4, stableford: 2, strokesToPar: -1 },
      { par: 5, stableford: -3, strokesToPar: 2 },
    ]);
  });

  it("includes the current remainder and all future rounds", () => {
    const plan = remainingRoundPlan(
      {
        leaderboardPosition: "T10",
        r1: round(1, Array(18).fill(0)),
        r3: round(3, [...Array(10).fill(0), ...Array(8).fill(null)]),
        r4: round(4, Array(18).fill(null)),
      },
      3,
    );

    expect(plan.map((item) => [item.round, item.pars.length])).toEqual([
      [3, 8],
      [4, 18],
    ]);
  });

  it("returns no future holes for cut players", () => {
    expect(
      remainingRoundPlan(
        {
          leaderboardPosition: "cut",
          r3: round(3, Array(18).fill(null)),
        },
        3,
      ),
    ).toEqual([]);
  });

  it("samples negative and positive outcomes deterministically", () => {
    const model = buildGenericScoringModel([
      { par: 4, stableford: -1, strokesToPar: 1 },
      { par: 4, stableford: 2, strokesToPar: -1 },
    ]);
    const plan = [{ round: 4, pars: [4, 4, 4, 4] }];
    const first = sampleRoundPlan(plan, model, createSeededRandom(42));
    const second = sampleRoundPlan(plan, model, createSeededRandom(42));

    expect(first).toEqual(second);
    expect(first.get(4)?.stableford).toBeGreaterThanOrEqual(-4);
    expect(first.get(4)?.stableford).toBeLessThanOrEqual(8);
  });
});
