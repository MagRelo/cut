import { describe, expect, it } from "vitest";
import {
  calculateRoundRobinOdds,
  probAtLeastK,
  publishDecimal,
  type PlayerFinishDecimals,
} from "./calculateRoundRobinOdds.js";

const planPlayers: [
  PlayerFinishDecimals,
  PlayerFinishDecimals,
  PlayerFinishDecimals,
  PlayerFinishDecimals,
] = [
  { top5: 2.2, top10: 1.9091, top20: 1.3636 },
  { top5: 2.4, top10: 2.0, top20: 1.4167 },
  { top5: 2.8, top10: 2.25, top20: 1.4762 },
  { top5: 3.2, top10: 2.5, top20: 1.5714 },
];

const margin08 = { margin: 0.08 };

describe("probAtLeastK", () => {
  it("sums hit patterns for two independent legs", () => {
    expect(probAtLeastK([0.5, 0.5], 2)).toBeCloseTo(0.25, 6);
    expect(probAtLeastK([0.5, 0.5], 1)).toBeCloseTo(0.75, 6);
  });

  it("matches plan Top 5 at-least-3 rate for four players", () => {
    const probs = planPlayers.map((p) => 1 / p.top5);
    expect(probAtLeastK(probs, 3)).toBeCloseTo(0.16065, 3);
  });
});

describe("publishDecimal", () => {
  it("shortens odds when margin increases", () => {
    const probs = planPlayers.map((p) => 1 / p.top5);
    const fair = publishDecimal(probs, 3, 0);
    const withMargin = publishDecimal(probs, 3, 0.08);
    expect(withMargin).toBeLessThan(fair);
    expect(withMargin).toBeCloseTo(fair / 1.08, 4);
  });
});

describe("calculateRoundRobinOdds", () => {
  it("Top 5 · 3 of 4 with 8% margin", () => {
    const cells = calculateRoundRobinOdds(planPlayers, margin08);
    const cell = cells.find((c) => c.row === "3 of 4" && c.col === "Top 5");
    expect(cell).toBeDefined();
    expect(cell!.decimal).toBeCloseTo(5.764, 3);
    expect(cell!.american).toMatch(/\+476/);
  });

  it("Top 5 · 2 of 4 with 8% margin", () => {
    const cells = calculateRoundRobinOdds(planPlayers, margin08);
    const cell = cells.find((c) => c.row === "2 of 4" && c.col === "Top 5");
    expect(cell).toBeDefined();
    expect(cell!.decimal).toBeCloseTo(1.853, 3);
    expect(cell!.american).toMatch(/-117/);
  });

  it("Top 5 · 4 of 4 with 8% margin", () => {
    const cells = calculateRoundRobinOdds(planPlayers, margin08);
    const cell = cells.find((c) => c.row === "4 of 4" && c.col === "Top 5");
    expect(cell).toBeDefined();
    expect(cell!.decimal).toBeCloseTo(43.804, 3);
  });

  it("Top 5 · 3 of 4 with zero margin (fair independence)", () => {
    const cells = calculateRoundRobinOdds(planPlayers, { margin: 0 });
    const cell = cells.find((c) => c.row === "3 of 4" && c.col === "Top 5");
    expect(cell).toBeDefined();
    expect(cell!.decimal).toBeCloseTo(6.2248, 3);
  });

  it("lower decimal when margin is higher for same cell", () => {
    const fair = calculateRoundRobinOdds(planPlayers, { margin: 0 });
    const margined = calculateRoundRobinOdds(planPlayers, margin08);
    const fairCell = fair.find((c) => c.row === "3 of 4" && c.col === "Top 10")!;
    const marginedCell = margined.find((c) => c.row === "3 of 4" && c.col === "Top 10")!;
    expect(marginedCell.decimal).toBeLessThan(fairCell.decimal);
  });
});
