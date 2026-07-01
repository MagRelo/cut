import { describe, expect, it } from "vitest";
import {
  mergeEventPeriodFields,
  mergeScoreDataPeriodFields,
  readCurrentPeriod,
  readPeriodDisplay,
  readPeriodStatusDisplay,
} from "./eventPeriod.js";

describe("eventPeriod metadata readers", () => {
  it("prefers period* fields over legacy round* fields", () => {
    const metadata = {
      currentPeriod: 2,
      periodDisplay: "R2",
      periodStatusDisplay: "In Progress",
      currentRound: 9,
      roundDisplay: "R9",
    };
    expect(readCurrentPeriod(metadata)).toBe(2);
    expect(readPeriodDisplay(metadata)).toBe("R2");
    expect(readPeriodStatusDisplay(metadata)).toBe("In Progress");
  });

  it("falls back to legacy round* fields", () => {
    const metadata = {
      currentRound: 3,
      roundDisplay: "R3",
      roundStatusDisplay: "Complete",
    };
    expect(readCurrentPeriod(metadata)).toBe(3);
    expect(readPeriodDisplay(metadata)).toBe("R3");
    expect(readPeriodStatusDisplay(metadata)).toBe("Complete");
  });
});

describe("mergeEventPeriodFields", () => {
  it("writes period fields and removes legacy keys", () => {
    const merged = mergeEventPeriodFields(
      { currentRound: 1, roundDisplay: "R1", foo: "bar" },
      {
        currentPeriod: 2,
        periodDisplay: "R2",
        periodStatusDisplay: "In Progress",
      },
    );
    expect(merged).toEqual({
      foo: "bar",
      currentPeriod: 2,
      periodDisplay: "R2",
      periodStatusDisplay: "In Progress",
    });
  });
});

describe("mergeScoreDataPeriodFields", () => {
  it("renames scoreData current period field", () => {
    const merged = mergeScoreDataPeriodFields({ currentRound: 4, r1: { total: 1 } }, {
      currentPeriod: 5,
    });
    expect(merged).toEqual({ currentPeriod: 5, r1: { total: 1 } });
  });
});
