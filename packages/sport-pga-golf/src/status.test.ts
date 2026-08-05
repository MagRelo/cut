import { describe, expect, it } from "vitest";
import {
  golfEventStatusFromMetadata,
  golfPeriodInProgress,
  golfShouldSettleContest,
  golfShouldSyncLiveScores,
} from "./status.js";

function metadataWithStatus(status: string) {
  return { name: "Test Event", pgaTourId: "R2026001", status };
}

describe("golfEventStatusFromMetadata", () => {
  it.each([
    ["COMPLETED", "COMPLETE"],
    ["COMPLETE", "COMPLETE"],
    ["OFFICIAL", "COMPLETE"],
    ["completed", "COMPLETE"],
    ["IN_PROGRESS", "LIVE"],
    ["in_progress", "LIVE"],
    ["UPCOMING", "SCHEDULED"],
    ["", "SCHEDULED"],
  ] as const)("maps %s to %s", (raw, expected) => {
    expect(golfEventStatusFromMetadata(metadataWithStatus(raw))).toBe(expected);
  });

  it("returns SCHEDULED for missing metadata", () => {
    expect(golfEventStatusFromMetadata(null)).toBe("SCHEDULED");
    expect(golfEventStatusFromMetadata({})).toBe("SCHEDULED");
  });
});

describe("golfShouldSettleContest", () => {
  it.each([
    ["COMPLETED", true],
    ["COMPLETE", true],
    ["OFFICIAL", true],
    ["IN_PROGRESS", false],
    ["UPCOMING", false],
    ["", false],
  ] as const)("returns %s for status %s", (raw, expected) => {
    expect(golfShouldSettleContest(metadataWithStatus(raw))).toBe(expected);
  });
});

describe("golfPeriodInProgress", () => {
  it("is true when the period is In Progress", () => {
    expect(
      golfPeriodInProgress({
        name: "Test",
        pgaTourId: "R1",
        status: "IN_PROGRESS",
        periodStatusDisplay: "In Progress",
      }),
    ).toBe(true);
  });

  it("is false when the period is Complete between rounds", () => {
    expect(
      golfPeriodInProgress({
        name: "Test",
        pgaTourId: "R1",
        status: "IN_PROGRESS",
        periodStatusDisplay: "Complete",
      }),
    ).toBe(false);
  });

  it("is true for playoffs even without In Progress", () => {
    expect(
      golfPeriodInProgress({
        name: "Test",
        pgaTourId: "R1",
        status: "IN_PROGRESS",
        periodDisplay: "Playoff",
        periodStatusDisplay: "Complete",
      }),
    ).toBe(true);
  });
});

describe("golfShouldSyncLiveScores", () => {
  it("still syncs when the period is Complete", () => {
    expect(
      golfShouldSyncLiveScores({
        name: "Test",
        pgaTourId: "R1",
        status: "IN_PROGRESS",
        periodStatusDisplay: "Complete",
      }),
    ).toBe(true);
  });
});
