import { beforeEach, describe, expect, it, vi } from "vitest";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";

const { prismaMock, getTournament } = vi.hoisted(() => ({
  prismaMock: {
    competitionEvent: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  getTournament: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

vi.mock("../../lib/pgaTournament.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/pgaTournament.js")>();
  return {
    ...actual,
    getTournament,
  };
});

import { syncGolfEventMetadata } from "./syncMetadata.js";

const EVENT_ID = "evt-austin";

function tournamentFeed() {
  return {
    tournamentName: "Austin Championship presented by Compliance Solutions",
    tournamentStatus: "IN_PROGRESS",
    displayDate: "Nov 5 - 8, 2026",
    timezone: "America/Chicago",
    seasonYear: 2026,
    city: "Bee Cave",
    state: "Texas",
    beautyImage: " https://pga.example/feed.jpg ",
    currentRound: 2,
    roundDisplay: "Round 2",
    roundStatusDisplay: "In Progress",
    weather: { tempF: 72, condition: "SUNNY", windSpeedMPH: 8 },
    courses: [
      { courseName: "Fazio Canyons Course - Omni Barton Creek Resort & Spa" },
    ],
  };
}

function eventRow(metadata: Record<string, unknown>) {
  return {
    id: EVENT_ID,
    sportId: PGA_GOLF_SPORT_ID,
    externalId: "R2026558",
    metadata,
  };
}

function writtenMetadata(): Record<string, unknown> {
  const updateArg = prismaMock.competitionEvent.update.mock.calls.at(-1)?.[0];
  return updateArg.data.metadata as Record<string, unknown>;
}

describe("syncGolfEventMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTournament.mockResolvedValue(tournamentFeed());
    prismaMock.competitionEvent.update.mockImplementation(async ({ data }) => data);
  });

  it("keeps stored display fields and refreshes live status, round, and weather", async () => {
    prismaMock.competitionEvent.findFirst.mockResolvedValue(
      eventRow({
        name: "Austin Championship",
        course: "Fazio Canyons Course",
        beautyImage: "https://www.omnihotels.com/fazio.jpg",
        city: "Austin",
        state: "TX",
        timezone: "America/Chicago",
        pgaTourId: "R2026558",
        status: "NOT_STARTED",
        summarySections: [{ heading: "Keep" }],
      }),
    );

    await syncGolfEventMetadata(EVENT_ID);

    expect(prismaMock.competitionEvent.update).toHaveBeenCalledTimes(1);
    const metadata = writtenMetadata();
    expect(metadata.name).toBe("Austin Championship");
    expect(metadata.course).toBe("Fazio Canyons Course");
    expect(metadata.beautyImage).toBe("https://www.omnihotels.com/fazio.jpg");
    expect(metadata.city).toBe("Austin");
    expect(metadata.state).toBe("TX");
    expect(metadata.timezone).toBe("America/Chicago");
    expect(metadata.summarySections).toEqual([{ heading: "Keep" }]);
    expect(metadata.status).toBe("IN_PROGRESS");
    expect(metadata.currentPeriod).toBe(2);
    expect(metadata.periodDisplay).toBe("Round 2");
    expect(metadata.periodStatusDisplay).toBe("In Progress");
    expect(metadata.weather).toMatchObject({
      tempF: 72,
      formatted: "72 · SUNNY · 8mph",
    });
    expect(metadata.startDate).toEqual(expect.any(String));
    expect(metadata.endDate).toEqual(expect.any(String));
  });

  it("fills blank display fields from the feed", async () => {
    prismaMock.competitionEvent.findFirst.mockResolvedValue(
      eventRow({
        name: "  ",
        course: "",
        beautyImage: null,
        status: "NOT_STARTED",
        pgaTourId: "R2026558",
      }),
    );

    await syncGolfEventMetadata(EVENT_ID);

    const metadata = writtenMetadata();
    expect(metadata.name).toBe("Austin Championship presented by Compliance Solutions");
    expect(metadata.course).toBe(
      "Fazio Canyons Course - Omni Barton Creek Resort & Spa",
    );
    expect(metadata.beautyImage).toBe("https://pga.example/feed.jpg");
    expect(metadata.city).toBe("Bee Cave");
    expect(metadata.state).toBe("Texas");
    expect(metadata.timezone).toBe("America/Chicago");
  });

  it("skips the write when the merged metadata matches what is stored", async () => {
    prismaMock.competitionEvent.findFirst.mockResolvedValue(
      eventRow({
        name: "Austin Championship",
        course: "Fazio Canyons Course",
        beautyImage: "https://www.omnihotels.com/fazio.jpg",
        city: "Austin",
        state: "TX",
        timezone: "America/Chicago",
        pgaTourId: "R2026558",
        status: "NOT_STARTED",
      }),
    );

    await syncGolfEventMetadata(EVENT_ID);
    const settled = writtenMetadata();

    prismaMock.competitionEvent.update.mockClear();
    prismaMock.competitionEvent.findFirst.mockResolvedValue(eventRow(settled));

    await syncGolfEventMetadata(EVENT_ID);

    expect(prismaMock.competitionEvent.update).not.toHaveBeenCalled();
  });
});
