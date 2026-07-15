import { describe, expect, it } from "vitest";
import { remainingCapacity } from "./remainingCapacity.js";

function roundWithHoles(played: number, total = 18, round = 4) {
  const stableford = Array.from({ length: total }, (_, i) =>
    i < played ? 2 : null,
  );
  return {
    holes: {
      round,
      par: Array(total).fill(4),
      scores: stableford.map((s) => (s === null ? null : 4)),
      stableford,
      total: played * 2,
    },
    total: played * 2,
    ratio: played / total,
    icon: "",
  };
}

describe("remainingCapacity", () => {
  it("counts null stableford holes on rCurrent", () => {
    const cap = remainingCapacity(
      {
        leaderboardPosition: "T10",
        rCurrent: roundWithHoles(14, 18, 4),
      },
      { maxPtsPerHole: 4 },
    );
    expect(cap.holesLeft).toBe(4);
    expect(cap.maxRemaining).toBe(16);
    expect(cap.roundUsed).toBe(4);
  });

  it("returns zero for WD and CUT", () => {
    expect(
      remainingCapacity({
        leaderboardPosition: "WD",
        rCurrent: roundWithHoles(10),
      }).maxRemaining,
    ).toBe(0);
    expect(
      remainingCapacity({
        leaderboardPosition: "CUT",
        r4: roundWithHoles(0),
      }).maxRemaining,
    ).toBe(0);
  });

  it("prefers period round when rCurrent missing", () => {
    const cap = remainingCapacity(
      {
        leaderboardPosition: "5",
        r4: roundWithHoles(16, 18, 4),
      },
      { currentPeriod: 4, maxPtsPerHole: 3 },
    );
    expect(cap.holesLeft).toBe(2);
    expect(cap.maxRemaining).toBe(6);
  });

  it("returns zero when round is finished", () => {
    const cap = remainingCapacity({
      leaderboardPosition: "1",
      rCurrent: roundWithHoles(18, 18, 4),
    });
    expect(cap.holesLeft).toBe(0);
    expect(cap.maxRemaining).toBe(0);
  });
});
