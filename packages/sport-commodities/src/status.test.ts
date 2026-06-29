import { describe, expect, it } from "vitest";
import { commoditiesEventStatus } from "./status.js";

const baseMeta = {
  sessionDate: "2026-06-29",
  sessionOpen: "2026-06-29T13:30:00.000Z",
  sessionClose: "2026-06-29T20:00:00.000Z",
};

describe("commoditiesEventStatus", () => {
  it("is SCHEDULED before open", () => {
    expect(commoditiesEventStatus(baseMeta, new Date("2026-06-29T12:00:00.000Z"))).toBe(
      "SCHEDULED",
    );
  });

  it("is LIVE between open and close", () => {
    expect(commoditiesEventStatus(baseMeta, new Date("2026-06-29T15:00:00.000Z"))).toBe("LIVE");
  });

  it("is COMPLETE after close", () => {
    expect(commoditiesEventStatus(baseMeta, new Date("2026-06-29T21:00:00.000Z"))).toBe("COMPLETE");
  });

  it("is COMPLETE when sessionComplete flag set", () => {
    expect(
      commoditiesEventStatus(
        { ...baseMeta, sessionComplete: true },
        new Date("2026-06-29T12:00:00.000Z"),
      ),
    ).toBe("COMPLETE");
  });
});
