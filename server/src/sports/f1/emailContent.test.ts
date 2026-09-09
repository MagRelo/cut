import { describe, expect, it } from "vitest";
import { F1_SPORT_ID } from "@cut/sport-f1";
import { createF1EmailContent } from "./emailContent.js";

const adapter = createF1EmailContent();

const f1Metadata = {
  name: "British Grand Prix",
  f1: {
    season: 2024,
    round: 12,
    meetingKey: 1234,
    sessionKey: 9558,
    circuitId: "silverstone",
    raceName: "British Grand Prix",
    raceStart: "2024-07-07T14:00:00.000Z",
    raceEnd: "2024-07-07T16:00:00.000Z",
  },
};

describe("createF1EmailContent", () => {
  it("uses circuitId and UTC race dates", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: F1_SPORT_ID,
      externalId: "9558",
      name: "British Grand Prix",
      metadata: f1Metadata,
    });

    expect(content.courseLine).toBe("Silverstone");
    expect(content.dateLine).toBe("Jul 7–Jul 7, 2024");
    expect(content.blurb).toBeNull();
    expect(content.leadSections).toEqual([]);
    expect(content.bodySections).toEqual([]);
  });

  it("humanizes underscored circuit ids", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: F1_SPORT_ID,
      externalId: "1",
      name: "Austrian Grand Prix",
      metadata: {
        name: "Austrian Grand Prix",
        f1: {
          ...f1Metadata.f1,
          circuitId: "red_bull_ring",
          raceName: "Austrian Grand Prix",
        },
      },
    });
    expect(content.courseLine).toBe("Red Bull Ring");
  });

  it("formats a late-UTC start on the UTC calendar day", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: F1_SPORT_ID,
      externalId: "1",
      name: "Singapore Grand Prix",
      metadata: {
        name: "Singapore Grand Prix",
        f1: {
          ...f1Metadata.f1,
          circuitId: "marina_bay",
          raceName: "Singapore Grand Prix",
          raceStart: "2024-09-22T03:00:00.000Z",
          raceEnd: "2024-09-22T05:00:00.000Z",
        },
      },
    });
    expect(content.courseLine).toBe("Marina Bay");
    expect(content.dateLine).toBe("Sep 22–Sep 22, 2024");
  });

  it("uses start-only when raceEnd is missing", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: F1_SPORT_ID,
      externalId: "9558",
      name: "British Grand Prix",
      metadata: {
        name: "British Grand Prix",
        f1: {
          season: 2024,
          round: 12,
          meetingKey: 1234,
          sessionKey: 9558,
          circuitId: "silverstone",
          raceName: "British Grand Prix",
          raceStart: "2024-07-07T14:00:00.000Z",
        },
      },
    });
    expect(content.dateLine).toBe("Jul 7, 2024");
  });

  it("omits dates when f1 metadata is missing", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: F1_SPORT_ID,
      externalId: "1",
      name: "Unknown",
      metadata: { name: "Unknown" },
    });
    expect(content.courseLine).toBe("");
    expect(content.dateLine).toBe("");
  });
});
