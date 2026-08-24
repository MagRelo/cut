import { describe, expect, it } from "vitest";
import { LINEUP_PREDICTION_TYPE } from "@cut/sport-sdk";
import { enrichDetailedResultsTiebreakers } from "./contestResultTiebreakers.js";

describe("enrichDetailedResultsTiebreakers", () => {
  it("adds prediction and distance for same-score lineups", () => {
    const results = enrichDetailedResultsTiebreakers(
      [
        {
          username: "a",
          lineupName: "A",
          entryId: "1",
          position: 1,
          score: 80,
          payoutBasisPoints: 10000,
        },
        {
          username: "b",
          lineupName: "B",
          entryId: "2",
          position: 2,
          score: 80,
          payoutBasisPoints: 0,
        },
      ],
      [
        {
          id: "cl1",
          entryId: "1",
          score: 80,
          createdAt: new Date("2026-01-02"),
          lineup: { prediction: { type: LINEUP_PREDICTION_TYPE, value: 82 } },
        },
        {
          id: "cl2",
          entryId: "2",
          score: 80,
          createdAt: new Date("2026-01-01"),
          lineup: { prediction: { type: LINEUP_PREDICTION_TYPE, value: 70 } },
        },
      ],
      "pga-golf",
    );

    expect(results?.[0]?.prediction).toBe(82);
    expect(results?.[0]?.predictionDistance).toBe(2);
    expect(results?.[1]?.prediction).toBe(70);
    expect(results?.[1]?.predictionDistance).toBe(10);
  });

  it("leaves rows that already have tiebreaker fields", () => {
    const existing = [
      {
        username: "a",
        lineupName: "A",
        entryId: "1",
        position: 1,
        score: 80,
        payoutBasisPoints: 10000,
        prediction: 99,
        predictionDistance: 1,
      },
    ];
    const results = enrichDetailedResultsTiebreakers(
      existing,
      [
        {
          id: "cl1",
          entryId: "1",
          score: 80,
          createdAt: new Date("2026-01-02"),
          lineup: { prediction: { type: LINEUP_PREDICTION_TYPE, value: 82 } },
        },
      ],
      "pga-golf",
    );
    expect(results?.[0]?.prediction).toBe(99);
  });
});
