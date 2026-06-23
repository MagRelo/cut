import { describe, expect, it } from "vitest";
import {
  cutBonus,
  positionBonus,
  transformGolfParticipantScores,
} from "@cut/sport-pga-golf";

describe("transformGolfParticipantScores", () => {
  it("applies position and cut bonuses without scorecard", () => {
    const result = transformGolfParticipantScores(
      { scoringData: { position: "T2", total: "-5" } },
      null,
      [{ scoringData: { position: "CUT" } }],
      2,
    );

    expect(result).toMatchObject({
      leaderboardPosition: "T2",
      bonus: 5,
      cut: 3,
      stableford: null,
      total: 8,
    });
  });

  it("sums stableford across four rounds from scorecard holes", () => {
    const makeRound = (roundNumber: number, birdiePar: number) => ({
      roundNumber,
      firstNine: {
        holes: [{ par: birdiePar, score: String(birdiePar - 1) }],
      },
      secondNine: {
        holes: [{ par: 4, score: "4" }],
      },
      total: 0,
    });

    const result = transformGolfParticipantScores(
      { scoringData: { position: "5", total: "-3" } },
      {
        roundScores: [makeRound(1, 4), makeRound(2, 5), makeRound(3, 3), makeRound(4, 4)],
      },
      [],
      2,
    );

    // Each round: birdie (+2) + par (0) = 2 stableford → 8 total
    expect(result?.stableford).toBe(8);
    expect(result?.total).toBe(8);
    expect(result?.r2?.total).toBe(2);
  });
});

describe("positionBonus", () => {
  it("awards top-three bonuses", () => {
    expect(positionBonus("1")).toBe(10);
    expect(positionBonus("T3")).toBe(3);
    expect(positionBonus("12")).toBe(0);
  });
});

describe("cutBonus", () => {
  it("awards cut survival points when cut has been made", () => {
    expect(cutBonus("40", true)).toBe(3);
    expect(cutBonus("CUT", true)).toBe(0);
  });
});
