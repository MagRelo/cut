import { describe, expect, it } from "vitest";
import {
  holeSeverity,
  isOutsizeHole,
  isRareOutsizeHole,
  labelHoleOutcome,
  listCompletedHoles,
  listNewOutsizeHoles,
} from "./contestFeedHoles.js";

function scoreDataWithHoles(
  round: number,
  holes: Array<{ par: number; strokes: number; stableford: number } | null>,
) {
  const par: number[] = [];
  const scores: Array<number | null> = [];
  const stableford: Array<number | null> = [];
  for (const hole of holes) {
    if (hole == null) {
      par.push(4);
      scores.push(null);
      stableford.push(null);
    } else {
      par.push(hole.par);
      scores.push(hole.strokes);
      stableford.push(hole.stableford);
    }
  }
  return {
    [`r${round}`]: {
      holes: { round, par, scores, stableford, total: 0 },
    },
  };
}

describe("contestFeedHoles", () => {
  it("labels outcomes from strokes to par", () => {
    expect(labelHoleOutcome(-2, 2)).toBe("eagle");
    expect(labelHoleOutcome(-1, 3)).toBe("birdie");
    expect(labelHoleOutcome(2, 6)).toBe("double_bogey_or_worse");
    expect(labelHoleOutcome(-2, 1)).toBe("hole_in_one");
  });

  it("flags outsize and rare holes", () => {
    expect(isOutsizeHole({ strokesToPar: -1 })).toBe(true);
    expect(isOutsizeHole({ strokesToPar: 0 })).toBe(false);
    expect(isRareOutsizeHole({ strokesToPar: -1, strokes: 3 })).toBe(false);
    expect(isRareOutsizeHole({ strokesToPar: -2, strokes: 2 })).toBe(true);
    expect(isRareOutsizeHole({ strokesToPar: 2, strokes: 6 })).toBe(true);
  });

  it("lists completed holes with keys and ranks severity", () => {
    const holes = listCompletedHoles(
      scoreDataWithHoles(4, [
        { par: 4, strokes: 2, stableford: 5 },
        { par: 4, strokes: 6, stableford: -3 },
        null,
      ]),
    );
    expect(holes).toEqual([
      {
        key: "4:1",
        round: 4,
        hole: 1,
        par: 4,
        strokes: 2,
        strokesToPar: -2,
        stableford: 5,
        label: "eagle",
      },
      {
        key: "4:2",
        round: 4,
        hole: 2,
        par: 4,
        strokes: 6,
        strokesToPar: 2,
        stableford: -3,
        label: "double_bogey_or_worse",
      },
    ]);
    expect(holeSeverity(holes[0]!)).toBeGreaterThan(holeSeverity({
      strokesToPar: -1,
      strokes: 3,
      label: "birdie",
    }));
  });

  it("returns only new outsize holes after a prior fingerprint", () => {
    const scoreData = scoreDataWithHoles(3, [
      { par: 4, strokes: 3, stableford: 2 },
      { par: 4, strokes: 6, stableford: -3 },
    ]);
    expect(listNewOutsizeHoles(scoreData, null)).toEqual([]);
    expect(
      listNewOutsizeHoles(scoreData, {
        displayName: "Golfer",
        completedKeys: ["3:1"],
      }).map((hole) => hole.key),
    ).toEqual(["3:2"]);
  });
});
