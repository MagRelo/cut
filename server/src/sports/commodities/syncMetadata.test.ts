import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    competitionEvent: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

import { syncCommoditiesEventMetadata } from "./syncMetadata.js";

describe("syncCommoditiesEventMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.COMMODITIES_SESSION_TZ;
    delete process.env.COMMODITIES_SESSION_OPEN;
    delete process.env.COMMODITIES_SESSION_CLOSE;
    process.env.COMMODITIES_SESSION_TZ = "America/New_York";
    process.env.COMMODITIES_SESSION_OPEN = "09:30";
    process.env.COMMODITIES_SESSION_CLOSE = "16:00";
  });

  afterEach(() => {
    delete process.env.COMMODITIES_SESSION_TZ;
    delete process.env.COMMODITIES_SESSION_OPEN;
    delete process.env.COMMODITIES_SESSION_CLOSE;
  });

  it("preserves explicit session bounds on sync", async () => {
    prismaMock.competitionEvent.findFirst.mockResolvedValue({
      id: "evt-1",
      sportId: COMMODITIES_SPORT_ID,
      externalId: "2026-06-30",
      metadata: {
        commodities: {
          sessionDate: "2026-06-30",
          sessionOpen: "2026-06-30T14:00:00.000Z",
          sessionClose: "2026-06-30T18:00:00.000Z",
          sessionStarted: false,
          sessionComplete: false,
        },
      },
    });

    await syncCommoditiesEventMetadata("evt-1");

    expect(prismaMock.competitionEvent.update).toHaveBeenCalledTimes(1);
    const updateArg = prismaMock.competitionEvent.update.mock.calls[0]?.[0];
    const commodities = (updateArg.data.metadata as { commodities: Record<string, unknown> })
      .commodities;

    expect(commodities.sessionOpen).toBe("2026-06-30T14:00:00.000Z");
    expect(commodities.sessionClose).toBe("2026-06-30T18:00:00.000Z");
  });

  it("sets sessionStarted when wall clock passes session open", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T15:00:00.000Z"));

    prismaMock.competitionEvent.findFirst.mockResolvedValue({
      id: "evt-3",
      sportId: COMMODITIES_SPORT_ID,
      externalId: "2026-06-30",
      metadata: {
        commodities: {
          sessionDate: "2026-06-30",
          sessionOpen: "2026-06-30T14:00:00.000Z",
          sessionClose: "2026-06-30T18:00:00.000Z",
          sessionStarted: false,
          sessionComplete: false,
        },
      },
    });

    await syncCommoditiesEventMetadata("evt-3");

    const updateArg = prismaMock.competitionEvent.update.mock.calls[0]?.[0];
    const commodities = (updateArg.data.metadata as { commodities: Record<string, unknown> })
      .commodities;

    expect(commodities.sessionStarted).toBe(true);
    expect(commodities.sessionComplete).toBe(false);

    vi.useRealTimers();
  });

  it("fills missing session bounds from env defaults", async () => {
    prismaMock.competitionEvent.findFirst.mockResolvedValue({
      id: "evt-2",
      sportId: COMMODITIES_SPORT_ID,
      externalId: "2026-06-30",
      metadata: {
        commodities: {
          sessionDate: "2026-06-30",
        },
      },
    });

    await syncCommoditiesEventMetadata("evt-2");

    const updateArg = prismaMock.competitionEvent.update.mock.calls[0]?.[0];
    const commodities = (updateArg.data.metadata as { commodities: Record<string, unknown> })
      .commodities;

    expect(commodities.sessionOpen).toBe("2026-06-30T13:30:00.000Z");
    expect(commodities.sessionClose).toBe("2026-06-30T20:00:00.000Z");
  });
});
