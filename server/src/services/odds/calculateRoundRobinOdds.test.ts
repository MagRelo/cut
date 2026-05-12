import { describe, expect, it } from "vitest";
import {
  calculateRoundRobinOdds,
  type PlayerFinishDecimals,
} from "./calculateRoundRobinOdds.js";

describe("calculateRoundRobinOdds", () => {
  it("matches plan example for Top 5 / 2 of 4 (mean combo decimal)", () => {
    const players: [PlayerFinishDecimals, PlayerFinishDecimals, PlayerFinishDecimals, PlayerFinishDecimals] = [
      { top5: 2.2, top10: 1.9091, top20: 1.3636 },
      { top5: 2.4, top10: 2.0, top20: 1.4167 },
      { top5: 2.8, top10: 2.25, top20: 1.4762 },
      { top5: 3.2, top10: 2.5, top20: 1.5714 },
    ];

    const cells = calculateRoundRobinOdds(players);
    const top5_2of4 = cells.find((c) => c.row === "2 of 4" && c.col === "Top 5");
    expect(top5_2of4).toBeDefined();
    expect(top5_2of4!.decimal).toBeCloseTo(6.9733, 3);
    expect(top5_2of4!.american).toMatch(/\+597/);
  });
});
