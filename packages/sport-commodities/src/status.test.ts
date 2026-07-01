import { describe, expect, it } from "vitest";
import { commoditiesEventStatus, commoditiesShouldSyncLiveScores } from "./status.js";

const baseMeta = {
  sessionDate: "2026-06-29",
  sessionOpen: "2026-06-29T13:30:00.000Z",
  sessionClose: "2026-06-29T20:00:00.000Z",
};

describe("commoditiesEventStatus", () => {
  it("is SCHEDULED before cron marks session started", () => {
    expect(commoditiesEventStatus(baseMeta)).toBe("SCHEDULED");
  });

  it("is LIVE when sessionStarted is set", () => {
    expect(commoditiesEventStatus({ ...baseMeta, sessionStarted: true })).toBe("LIVE");
  });

  it("is COMPLETE when sessionComplete flag set", () => {
    expect(
      commoditiesEventStatus({
        ...baseMeta,
        sessionStarted: true,
        sessionComplete: true,
      }),
    ).toBe("COMPLETE");
  });

  it("is COMPLETE even if sessionStarted is false when sessionComplete is set", () => {
    expect(commoditiesEventStatus({ ...baseMeta, sessionComplete: true })).toBe("COMPLETE");
  });

  it("stays SCHEDULED after open time until sessionStarted is set", () => {
    expect(
      commoditiesEventStatus({
        ...baseMeta,
        sessionOpen: "2026-06-29T13:30:00.000Z",
        sessionClose: "2026-06-29T20:00:00.000Z",
      }),
    ).toBe("SCHEDULED");
  });
});

describe("commoditiesShouldSyncLiveScores", () => {
  it("syncs during LIVE", () => {
    expect(
      commoditiesShouldSyncLiveScores({
        commodities: { ...baseMeta, sessionStarted: true },
      }),
    ).toBe(true);
  });

  it("does not sync when SCHEDULED", () => {
    expect(commoditiesShouldSyncLiveScores({ commodities: baseMeta })).toBe(false);
  });

  it("does not sync when COMPLETE", () => {
    expect(
      commoditiesShouldSyncLiveScores({
        commodities: { ...baseMeta, sessionStarted: true, sessionComplete: true },
      }),
    ).toBe(false);
  });
});
