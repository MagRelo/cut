import { describe, expect, it } from "vitest";
import { rankF1Entries } from "./ranking.js";

describe("rankF1Entries", () => {
  const t0 = new Date("2024-01-01T00:00:00Z");
  const t1 = new Date("2024-01-02T00:00:00Z");

  it("ranks by score descending", () => {
    const ranked = rankF1Entries([
      { entryId: "a", score: 40, prediction: null, createdAt: t0 },
      { entryId: "b", score: 60, prediction: null, createdAt: t0 },
    ]);
    expect(ranked.map((r) => r.entryId)).toEqual(["b", "a"]);
    expect(ranked[0]?.position).toBe(1);
  });

  it("uses winningLineupPoints tie-break against contest max score", () => {
    const ranked = rankF1Entries([
      {
        entryId: "a",
        score: 50,
        prediction: { type: "winningLineupPoints", value: 55 },
        createdAt: t0,
      },
      {
        entryId: "b",
        score: 50,
        prediction: { type: "winningLineupPoints", value: 52 },
        createdAt: t1,
      },
    ]);
    expect(ranked.map((r) => r.entryId)).toEqual(["b", "a"]);
    expect(ranked[0]?.predictionDistance).toBe(2);
  });

  it("breaks remaining ties by entry time", () => {
    const ranked = rankF1Entries([
      { entryId: "later", score: 30, prediction: null, createdAt: t1 },
      { entryId: "earlier", score: 30, prediction: null, createdAt: t0 },
    ]);
    expect(ranked.map((r) => r.entryId)).toEqual(["earlier", "later"]);
  });
});
