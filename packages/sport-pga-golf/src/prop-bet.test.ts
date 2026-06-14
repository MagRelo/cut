import { describe, expect, it } from "vitest";
import { gradeGolfPropTicket, isGolfFinishInTopN } from "./prop-bet.js";

describe("isGolfFinishInTopN", () => {
  it("grades numeric positions", () => {
    expect(isGolfFinishInTopN("T5", 10)).toBe(true);
    expect(isGolfFinishInTopN("12", 10)).toBe(false);
  });

  it("treats missed cut as out of top N", () => {
    expect(isGolfFinishInTopN("CUT", 20)).toBe(false);
  });
});

describe("gradeGolfPropTicket", () => {
  const ticket = {
    hitsRequired: 2,
    topN: 10,
    eventParticipantIds: ["a", "b", "c", "d"],
  };

  it("returns WON when enough players finish in top N", () => {
    expect(
      gradeGolfPropTicket(ticket, {
        leaderboardPositions: ["5", "8", "CUT", "40"],
      }),
    ).toBe("WON");
  });

  it("returns LOST when hits are below threshold", () => {
    expect(
      gradeGolfPropTicket(ticket, {
        leaderboardPositions: ["5", "CUT", "CUT", "40"],
      }),
    ).toBe("LOST");
  });

  it("returns VOID for indeterminate positions", () => {
    expect(
      gradeGolfPropTicket(ticket, {
        leaderboardPositions: ["5", "?", "CUT", "40"],
      }),
    ).toBe("VOID");
  });
});
