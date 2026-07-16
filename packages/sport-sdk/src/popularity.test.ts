import { describe, expect, it } from "vitest";
import {
  adjustPickScore,
  buildPickPopularityMap,
  computePickRates,
  normalizePopularityRules,
  sumLineupScores,
} from "./popularity.js";

describe("normalizePopularityRules", () => {
  it("fills defaults", () => {
    expect(normalizePopularityRules({ weight: 0.5 })).toEqual({
      weight: 0.5,
      strength: 1,
      cap: 2,
      mode: "multiplicative",
      minEntryFloor: 5,
    });
  });

  it("defaults weight to 0 when omitted", () => {
    expect(normalizePopularityRules(undefined).weight).toBe(0);
  });
});

describe("computePickRates", () => {
  it("returns null below minEntryFloor", () => {
    expect(
      computePickRates(
        [
          ["a", "b"],
          ["a", "c"],
          ["b", "c"],
          ["a", "d"],
        ],
        5,
      ),
    ).toBeNull();
  });

  it("computes fractions with unique picks per lineup", () => {
    const rates = computePickRates(
      [
        ["a", "b"],
        ["a", "c"],
        ["a", "d"],
        ["b", "e"],
        ["c", "e"],
      ],
      5,
    );
    expect(rates).not.toBeNull();
    expect(rates!.get("a")).toBe(3 / 5);
    expect(rates!.get("b")).toBe(2 / 5);
    expect(rates!.get("e")).toBe(2 / 5);
  });

  it("counts duplicate picks in one lineup once", () => {
    const rates = computePickRates([["a", "a", "b"], ["a"], ["a"], ["a"], ["b"]], 5);
    expect(rates!.get("a")).toBe(4 / 5);
  });
});

describe("adjustPickScore", () => {
  const rules = { weight: 0.5, strength: 1, cap: 2, mode: "multiplicative" as const };

  it("passthrough when weight is 0", () => {
    expect(adjustPickScore(22, 0.1, { weight: 0 })).toEqual({
      bonus: 0,
      adjustedScore: 22,
    });
  });

  it("passthrough when external total is <= 0", () => {
    expect(adjustPickScore(0, 0.1, rules)).toEqual({ bonus: 0, adjustedScore: 0 });
    expect(adjustPickScore(-5, 0.1, rules)).toEqual({ bonus: 0, adjustedScore: -5 });
  });

  it("gives zero bonus at 100% ownership with positive weight", () => {
    const result = adjustPickScore(22, 1, rules);
    expect(result.bonus).toBe(0);
    expect(result.adjustedScore).toBe(22);
  });

  it("rewards contrarian picks with positive weight", () => {
    const chalk = adjustPickScore(22, 0.8, rules);
    const contrarian = adjustPickScore(22, 0.1, rules);
    expect(contrarian.adjustedScore).toBeGreaterThan(chalk.adjustedScore);
    expect(contrarian.bonus).toBeGreaterThan(0);
    expect(chalk.bonus).toBeGreaterThanOrEqual(0);
  });

  it("bonus is always >= 0", () => {
    for (const o of [0, 0.25, 0.5, 0.75, 1]) {
      expect(adjustPickScore(20, o, rules).bonus).toBeGreaterThanOrEqual(0);
      expect(adjustPickScore(20, o, { ...rules, weight: -0.5 }).bonus).toBeGreaterThanOrEqual(0);
    }
  });

  it("additive mode adds bonus weight to score", () => {
    const multi = adjustPickScore(20, 0, { ...rules, mode: "multiplicative" });
    const add = adjustPickScore(20, 0, { ...rules, mode: "additive" });
    // o=0 → signal=1 → rawW=0.5 → wFloor=-0.5 → bonusWeight=1
    expect(multi.adjustedScore).toBe(40); // 20 * (1+1)
    expect(add.adjustedScore).toBe(21); // 20 + 1
    expect(multi.bonus).toBeGreaterThanOrEqual(0);
    expect(add.bonus).toBeGreaterThanOrEqual(0);
  });
});

describe("buildPickPopularityMap / sumLineupScores", () => {
  it("returns null when weight is 0", () => {
    const rates = new Map([["a", 0.2]]);
    const totals = new Map([["a", 10]]);
    expect(buildPickPopularityMap(rates, totals, { weight: 0 })).toBeNull();
  });

  it("sums base and adjusted scores", () => {
    const rates = computePickRates(
      [
        ["a", "b"],
        ["a", "c"],
        ["a", "d"],
        ["b", "e"],
        ["c", "e"],
      ],
      5,
    )!;
    const totals = new Map([
      ["a", 20],
      ["b", 10],
      ["c", 10],
      ["d", 10],
      ["e", 10],
    ]);
    const map = buildPickPopularityMap(rates, totals, {
      weight: 0.5,
      strength: 1,
      cap: 2,
      mode: "multiplicative",
    });
    expect(map).not.toBeNull();
    expect(map!.a.pickRate).toBe(0.6);

    const summed = sumLineupScores(["a", "b"], totals, map);
    expect(summed.baseScore).toBe(30);
    expect(summed.score).toBe(map!.a.adjustedScore + map!.b.adjustedScore);
    expect(summed.popularityBonus).toBe(summed.score - summed.baseScore);
  });

  it("falls back to external totals when map is null", () => {
    const totals = new Map([
      ["a", 5],
      ["b", 7],
    ]);
    expect(sumLineupScores(["a", "b"], totals, null)).toEqual({
      baseScore: 12,
      score: 12,
      popularityBonus: 0,
    });
  });
});
