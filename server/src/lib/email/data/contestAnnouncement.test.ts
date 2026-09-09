import { describe, expect, it, vi } from "vitest";

const { loadEventForEmail } = vi.hoisted(() => ({
  loadEventForEmail: vi.fn(),
}));

vi.mock("./event.js", () => ({
  loadEventForEmail,
}));

import {
  parseEmailAnnouncementContent,
  emailAnnouncementFromMetadata,
  compileEventAnnouncement,
  loadContestAnnouncementSource,
} from "./contestAnnouncement.js";
import { sectionsFromUnknownSummary } from "../../../sports/platformEmailContent.js";

const announcement = {
  courseLine: "TPC · Town",
  dateLine: "May 1–May 4, 2026",
  blurb: "Hello",
  leadSections: [],
  bodySections: [
    {
      key: "Course and Format",
      title: "Course and Format",
      kind: "bullets" as const,
      items: [{ body: "Par 72" }],
    },
  ],
};

describe("parseEmailAnnouncementContent", () => {
  it("returns the snapshot when valid", () => {
    expect(parseEmailAnnouncementContent(announcement)).toEqual(announcement);
  });

  it("returns null for invalid payloads", () => {
    expect(parseEmailAnnouncementContent(null)).toBeNull();
    expect(parseEmailAnnouncementContent({ courseLine: "x" })).toBeNull();
  });
});

describe("emailAnnouncementFromMetadata", () => {
  it("reads emailAnnouncement from event metadata", () => {
    expect(
      emailAnnouncementFromMetadata({
        name: "Event",
        emailAnnouncement: announcement,
      }),
    ).toEqual(announcement);
  });
});

describe("sectionsFromUnknownSummary", () => {
  it("maps title/items and heading/body shapes", () => {
    const sections = sectionsFromUnknownSummary([
      { title: "Preview", items: [{ body: "one" }] },
      { heading: "Notes", body: "two" },
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.title).toBe("Preview");
    expect(sections[0]?.items[0]?.body).toBe("one");
    expect(sections[1]?.title).toBe("Notes");
    expect(sections[1]?.items[0]?.body).toBe("two");
  });
});

describe("compileEventAnnouncement", () => {
  it("uses the F1 adapter for circuit and race dates", async () => {
    const compiled = await compileEventAnnouncement({
      id: "e1",
      sportId: "f1",
      externalId: "9558",
      name: "British Grand Prix",
      metadata: {
        name: "British Grand Prix",
        f1: {
          season: 2024,
          round: 12,
          meetingKey: 1,
          sessionKey: 9558,
          circuitId: "silverstone",
          raceName: "British Grand Prix",
          raceStart: "2024-07-07T14:00:00.000Z",
          raceEnd: "2024-07-07T16:00:00.000Z",
        },
      },
      emailAnnouncement: null,
    });
    expect(compiled.courseLine).toBe("Silverstone");
    expect(compiled.dateLine).toBe("Jul 7–Jul 7, 2024");
  });
});

describe("loadContestAnnouncementSource", () => {
  it("uses the snapshot when present", async () => {
    loadEventForEmail.mockReset();
    loadEventForEmail.mockResolvedValue({
      id: "e1",
      sportId: "f1",
      externalId: "9558",
      name: "British Grand Prix",
      metadata: { name: "British Grand Prix" },
      emailAnnouncement: announcement,
    });

    const source = await loadContestAnnouncementSource("e1");
    expect(source?.announcement).toEqual(announcement);
  });

  it("compiles live when the snapshot is missing", async () => {
    loadEventForEmail.mockReset();
    loadEventForEmail.mockResolvedValue({
      id: "e1",
      sportId: "f1",
      externalId: "9558",
      name: "British Grand Prix",
      metadata: {
        name: "British Grand Prix",
        f1: {
          season: 2024,
          round: 12,
          meetingKey: 1,
          sessionKey: 9558,
          circuitId: "silverstone",
          raceName: "British Grand Prix",
          raceStart: "2024-07-07T14:00:00.000Z",
          raceEnd: "2024-07-07T16:00:00.000Z",
        },
      },
      emailAnnouncement: null,
    });

    const source = await loadContestAnnouncementSource("e1");
    expect(source?.announcement.courseLine).toBe("Silverstone");
    expect(source?.announcement.dateLine).toBe("Jul 7–Jul 7, 2024");
  });
});
