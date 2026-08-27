import { describe, expect, it } from "vitest";
import { compareContestEntryOrder } from "./lineupScore";

describe("compareContestEntryOrder", () => {
  it("orders by stored position first", () => {
    const rows = [
      { position: 3, score: 40 },
      { position: 1, score: 10 },
      { position: 2, score: 20 },
    ];
    expect([...rows].sort(compareContestEntryOrder).map((row) => row.position)).toEqual([
      1, 2, 3,
    ]);
  });

  it("breaks tied positions by score descending", () => {
    const rows = [
      { position: 999, score: 0 },
      { position: 999, score: 10 },
      { position: 999, score: 4 },
    ];
    expect([...rows].sort(compareContestEntryOrder).map((row) => row.score)).toEqual([
      10, 4, 0,
    ]);
  });
});
