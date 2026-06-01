import { describe, expect, it } from "vitest";
import {
  compareContestLineupRank,
  getContestWinningScore,
  sortContestLineups,
  tiebreakerDistance,
} from "./lineupTiebreaker.js";

function lineup(
  id: string,
  score: number,
  prediction: number | null,
  createdAt: Date,
) {
  return {
    id,
    score,
    createdAt,
    tournamentLineup: { winningScorePrediction: prediction },
  };
}

describe("tiebreakerDistance", () => {
  it("returns Infinity when prediction is missing", () => {
    expect(tiebreakerDistance(null, 100)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns absolute distance from contest winning score", () => {
    expect(tiebreakerDistance(95, 100)).toBe(5);
  });
});

describe("compareContestLineupRank", () => {
  const contestWinningScore = 100;

  it("ranks higher fantasy score first", () => {
    const a = lineup("a", 90, 100, new Date("2026-01-01"));
    const b = lineup("b", 80, 100, new Date("2026-01-02"));
    expect(compareContestLineupRank(a, b, contestWinningScore)).toBeLessThan(0);
  });

  it("uses prediction distance when scores tie", () => {
    const closer = lineup("close", 90, 98, new Date("2026-01-02"));
    const farther = lineup("far", 90, 120, new Date("2026-01-01"));
    expect(compareContestLineupRank(closer, farther, contestWinningScore)).toBeLessThan(0);
  });

  it("uses earlier contest entry when score and prediction distance tie", () => {
    const earlier = lineup("early", 90, 100, new Date("2026-01-01"));
    const later = lineup("late", 90, 100, new Date("2026-01-03"));
    expect(compareContestLineupRank(earlier, later, contestWinningScore)).toBeLessThan(0);
  });
});

describe("sortContestLineups", () => {
  it("assigns unique positions with no shared ranks", () => {
    const entries = [
      lineup("a", 50, 50, new Date("2026-01-03")),
      lineup("b", 50, 48, new Date("2026-01-02")),
      lineup("c", 50, 48, new Date("2026-01-01")),
      lineup("d", 40, 40, new Date("2026-01-04")),
    ];
    const contestWinningScore = getContestWinningScore(entries);
    const sorted = sortContestLineups(entries, contestWinningScore);
    expect(sorted.map((entry) => entry.id)).toEqual(["a", "c", "b", "d"]);
  });
});
