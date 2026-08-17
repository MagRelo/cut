import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, resolveContestDbId } = vi.hoisted(() => ({
  prismaMock: {
    competitionEvent: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    eventParticipant: {
      findUnique: vi.fn(),
    },
    contest: {
      findUnique: vi.fn(),
    },
  },
  resolveContestDbId: vi.fn(),
}));

vi.mock("./prisma.js", () => ({
  prisma: prismaMock,
}));

vi.mock("../utils/contestRouteParam.js", () => ({
  resolveContestDbId,
}));

import { resolvePageMetadata } from "./pageMetadata.js";

const BASE = "https://playthecut.com";
const PLAYER_ID = "cmnncq7e8003huyaoq41b3kfr";
const EVENT_ID = "cmnncq3a4000muyaofbe654z0";

function url(path: string): URL {
  return new URL(`${BASE}${path}`);
}

describe("resolvePageMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("titles player deep links as player | tournament", async function () {
    prismaMock.competitionEvent.findUnique.mockResolvedValue({
      id: EVENT_ID,
      sportId: "pga-golf",
      externalId: "R2026033",
      metadata: { name: "BMW Championship" },
    });
    prismaMock.eventParticipant.findUnique.mockResolvedValue({
      participant: { displayName: "Scottie Scheffler", metadata: null },
    });

    const meta = await resolvePageMetadata(
      url(`/sports/pga-golf/events/${EVENT_ID}/leaderboard?playerId=${PLAYER_ID}`),
      BASE,
    );

    expect(meta.title).toBe("Scottie Scheffler | BMW Championship");
    expect(meta.description).toBe("Scottie Scheffler at BMW Championship on Play The Cut.");
    expect(prismaMock.eventParticipant.findUnique).toHaveBeenCalledWith({
      where: {
        eventId_participantId: { eventId: EVENT_ID, participantId: PLAYER_ID },
      },
      select: {
        participant: { select: { displayName: true, metadata: true } },
      },
    });
  });

  it("resolves sport-scoped leaderboard shares via the active event", async function () {
    prismaMock.competitionEvent.findFirst.mockResolvedValue({
      id: EVENT_ID,
      sportId: "pga-golf",
      externalId: "R2026033",
      metadata: { name: "BMW Championship" },
    });
    prismaMock.eventParticipant.findUnique.mockResolvedValue({
      participant: { displayName: null, metadata: { displayName: "Rory McIlroy" } },
    });

    const meta = await resolvePageMetadata(
      url(`/sports/pga-golf/leaderboard?playerId=${PLAYER_ID}`),
      BASE,
    );

    expect(meta.title).toBe("Rory McIlroy | BMW Championship");
    expect(prismaMock.competitionEvent.findFirst).toHaveBeenCalledWith({
      where: { sportId: "pga-golf", isActive: true },
      select: { id: true, sportId: true, metadata: true, externalId: true },
    });
  });

  it("titles leaderboard pages as event | brand", async function () {
    prismaMock.competitionEvent.findUnique.mockResolvedValue({
      id: EVENT_ID,
      sportId: "pga-golf",
      externalId: "R2026033",
      metadata: { name: "BMW Championship" },
    });

    const meta = await resolvePageMetadata(
      url(`/sports/pga-golf/events/${EVENT_ID}/leaderboard`),
      BASE,
    );

    expect(meta.title).toBe("BMW Championship | Play The Cut");
    expect(meta.description).toBe("BMW Championship field on Play The Cut.");
    expect(prismaMock.eventParticipant.findUnique).not.toHaveBeenCalled();
  });

  it("titles the active-event leaderboard as event | brand", async function () {
    prismaMock.competitionEvent.findFirst.mockResolvedValue({
      id: EVENT_ID,
      sportId: "pga-golf",
      externalId: "R2026033",
      metadata: { name: "BMW Championship" },
    });

    const meta = await resolvePageMetadata(url("/sports/pga-golf/leaderboard"), BASE);

    expect(meta.title).toBe("BMW Championship | Play The Cut");
  });

  it("falls back to the event title when playerId is unknown", async function () {
    prismaMock.competitionEvent.findUnique.mockResolvedValue({
      id: EVENT_ID,
      sportId: "pga-golf",
      externalId: "R2026033",
      metadata: { name: "BMW Championship" },
    });
    prismaMock.eventParticipant.findUnique.mockResolvedValue(null);

    const meta = await resolvePageMetadata(
      url(`/sports/pga-golf/events/${EVENT_ID}/leaderboard?playerId=${PLAYER_ID}`),
      BASE,
    );
    expect(meta.title).toBe("BMW Championship | Play The Cut");
  });

  it("keeps contest lobby titles", async function () {
    resolveContestDbId.mockResolvedValue("contest-1");
    prismaMock.contest.findUnique.mockResolvedValue({
      name: "Sunday Funday",
      description: "Bring your A game.",
      settings: { primaryDeposit: 25 },
    });

    const meta = await resolvePageMetadata(url("/contest/0xabc"), BASE);

    expect(meta.title).toBe("$25 Sunday Funday | Play The Cut");
    expect(meta.description).toBe("Bring your A game.");
  });
});
