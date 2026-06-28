import { describe, expect, it } from "vitest";
import {
  f1EventStatusFromMetadata,
  f1ShouldActivateContest,
  f1ShouldSettleContest,
  f1ShouldSyncLiveScores,
} from "./status.js";

function metadata(overrides: Record<string, unknown> = {}) {
  return {
    f1: {
      season: 2024,
      round: 12,
      meetingKey: 1240,
      sessionKey: 9558,
      circuitId: "silverstone",
      raceName: "British Grand Prix",
      raceStart: "2024-07-07T14:00:00.000Z",
      ...overrides,
    },
  };
}

describe("f1EventStatusFromMetadata", () => {
  it("returns SCHEDULED before race start", () => {
    const now = new Date("2024-07-07T13:00:00.000Z");
    expect(f1EventStatusFromMetadata(metadata(), now)).toBe("SCHEDULED");
  });

  it("returns LIVE after race start and before classification", () => {
    const now = new Date("2024-07-07T15:00:00.000Z");
    expect(f1EventStatusFromMetadata(metadata(), now)).toBe("LIVE");
  });

  it("returns COMPLETE when classificationComplete is true", () => {
    const now = new Date("2024-07-07T13:00:00.000Z");
    expect(
      f1EventStatusFromMetadata(metadata({ classificationComplete: true }), now),
    ).toBe("COMPLETE");
  });

  it("returns SCHEDULED for missing metadata", () => {
    expect(f1EventStatusFromMetadata(null)).toBe("SCHEDULED");
    expect(f1EventStatusFromMetadata({})).toBe("SCHEDULED");
  });
});

describe("contest lifecycle helpers", () => {
  const beforeStart = new Date("2024-07-07T13:00:00.000Z");
  const duringRace = new Date("2024-07-07T15:00:00.000Z");
  const completeMeta = metadata({ classificationComplete: true });

  it("activates at LIVE", () => {
    expect(f1ShouldActivateContest(metadata(), duringRace)).toBe(true);
    expect(f1ShouldActivateContest(metadata(), beforeStart)).toBe(false);
  });

  it("settles at COMPLETE", () => {
    expect(f1ShouldSettleContest(completeMeta, beforeStart)).toBe(true);
    expect(f1ShouldSettleContest(metadata(), duringRace)).toBe(false);
  });

  it("syncs scores during LIVE and COMPLETE", () => {
    expect(f1ShouldSyncLiveScores(metadata(), duringRace)).toBe(true);
    expect(f1ShouldSyncLiveScores(completeMeta, beforeStart)).toBe(true);
    expect(f1ShouldSyncLiveScores(metadata(), beforeStart)).toBe(false);
  });
});
