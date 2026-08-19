import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, userFindUnique, queryRaw } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  userFindUnique: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contest: { findFirst },
    user: { findUnique: userFindUnique },
    $queryRaw: queryRaw,
  },
}));

import {
  getContestLobby,
  invalidateContestLobbyByAddress,
  loadContestLobby,
  slimParticipantMetadata,
} from "./getContestLobby.js";

const ADDRESS = "0x1234567890123456789012345678901234567890";

function golfEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    sportId: "pga-golf",
    externalId: "R2026001",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    sport: { id: "pga-golf", name: "PGA Golf" },
    metadata: {
      name: "Test Open",
      status: "LIVE",
      startDate: "2026-03-01",
      endDate: "2026-03-04",
      course: "Test National",
      beautyImage: "https://example.com/hero.png",
      summarySections: [{ heading: "Preview", body: "long copy" }],
      weather: { huge: true },
      fieldSnapshot: { players: [1, 2, 3] },
      ...overrides,
    },
  };
}

function pickRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "pick-1",
    slotIndex: 0,
    eventParticipantId: "ep-1",
    eventParticipant: {
      scoreData: { hole: 12 },
      total: 4,
      participant: {
        id: "part-1",
        displayName: "Rory McIlroy",
        externalId: "player-1",
        metadata: {
          firstName: "Rory",
          lastName: "McIlroy",
          imageUrl: "https://example.com/rory.png",
          country: "NIR",
          performance: { seasons: [2024] },
          priceHistory: [1, 2, 3],
        },
      },
    },
    ...overrides,
  };
}

function contestRow(overrides: Record<string, unknown> = {}) {
  const event = golfEvent();
  return {
    id: "contest-1",
    name: "Main",
    description: null,
    eventId: event.id,
    userGroupId: null,
    endTime: new Date("2026-03-04T00:00:00.000Z"),
    address: ADDRESS,
    chainId: 84532,
    status: "OPEN",
    settings: { contestType: "PUBLIC", oracle: "0xoracle" },
    results: null,
    pickPopularity: null,
    pickPopularityLockedAt: null,
    commentary: "Cutbot says hello",
    commentaryGeneratedAt: new Date("2026-03-02T00:00:00.000Z"),
    commentaryFeed: { items: [] },
    commentaryFeedGeneratedAt: new Date("2026-03-02T00:00:00.000Z"),
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    userGroup: null,
    event,
    _count: { contestLineups: 1 },
    contestLineups: [
      {
        id: "cl-1",
        contestId: "contest-1",
        userId: "user-1",
        lineupId: "lineup-1",
        position: null,
        score: null,
        baseScore: null,
        popularityBonus: null,
        status: "ACTIVE",
        entryId: "entry-1",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
        user: { id: "user-1", name: "Ada", settings: { color: "#112233", theme: "dark" } },
        lineup: {
          id: "lineup-1",
          name: "Ada's squad",
          prediction: { value: 272 },
          eventId: event.id,
          contestId: "contest-1",
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          updatedAt: new Date("2026-03-01T00:00:00.000Z"),
          picks: [pickRow()],
        },
      },
    ],
    onchainPayments: [],
    ...overrides,
  };
}

describe("getContestLobby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateContestLobbyByAddress(ADDRESS);
  });

  it("issues one contest.findFirst with public-only visibility when anonymous", async () => {
    findFirst.mockResolvedValue(contestRow());

    await loadContestLobby(ADDRESS, null);

    expect(findFirst).toHaveBeenCalledTimes(1);
    const where = findFirst.mock.calls[0]?.[0]?.where;
    expect(where.address).toEqual({ equals: ADDRESS, mode: "insensitive" });
    expect(where.OR).toEqual([{ userGroupId: null }]);
    expect(where).not.toHaveProperty("id");
  });

  it("includes membership filter for a signed-in Privy user", async () => {
    findFirst.mockResolvedValue(contestRow());

    await loadContestLobby(ADDRESS, "did:privy:1");

    const where = findFirst.mock.calls[0]?.[0]?.where;
    expect(where.OR).toEqual([
      { userGroupId: null },
      {
        userGroup: {
          members: {
            some: {
              user: { privyUserId: "did:privy:1" },
            },
          },
        },
      },
    ]);
  });

  it("looks up by database id when the param is not an address", async () => {
    findFirst.mockResolvedValue(contestRow());

    await loadContestLobby("contest-1", null);

    const where = findFirst.mock.calls[0]?.[0]?.where;
    expect(where.id).toBe("contest-1");
    expect(where).not.toHaveProperty("address");
  });

  it("masks OPEN picks but keeps lineup prediction", async () => {
    findFirst.mockResolvedValue(contestRow());

    const lobby = await loadContestLobby(ADDRESS, null);
    const lineup = lobby?.contestLineups as Array<{ lineup: Record<string, unknown> }>;

    expect(lineup[0]?.lineup).toEqual({
      id: "lineup-1",
      name: "Ada's squad",
      prediction: { value: 272 },
    });
    expect(lineup[0]?.lineup).not.toHaveProperty("picks");
  });

  it("keeps summarySections and drops fieldSnapshot from event metadata", async () => {
    findFirst.mockResolvedValue(contestRow());

    const lobby = await loadContestLobby(ADDRESS, null);
    const metadata = (lobby?.event as { metadata: Record<string, unknown> }).metadata;

    expect(metadata).toMatchObject({
      name: "Test Open",
      summarySections: [{ heading: "Preview", body: "long copy" }],
    });
    expect(metadata).not.toHaveProperty("fieldSnapshot");
    expect(metadata).not.toHaveProperty("weather");
  });

  it("includes slim pick identity after lock and drops bulky participant metadata", async () => {
    findFirst.mockResolvedValue(contestRow({ status: "ACTIVE" }));

    const lobby = await loadContestLobby(ADDRESS, null);
    const lineup = (
      lobby?.contestLineups as Array<{
        lineup: {
          prediction: unknown;
          picks: Array<{
            participant: { metadata: Record<string, unknown> | null };
            scoreData: unknown;
            total: number | null;
          }>;
        };
      }>
    )[0]?.lineup;

    expect(lineup?.prediction).toEqual({ value: 272 });
    expect(lineup?.picks).toHaveLength(1);
    expect(lineup?.picks[0]?.scoreData).toEqual({ hole: 12 });
    expect(lineup?.picks[0]?.total).toBe(4);
    expect(lineup?.picks[0]?.participant.metadata).toMatchObject({
      firstName: "Rory",
      lastName: "McIlroy",
      imageUrl: "https://example.com/rory.png",
      country: "NIR",
    });
    expect(lineup?.picks[0]?.participant.metadata).not.toHaveProperty("performance");
    expect(lineup?.picks[0]?.participant.metadata).not.toHaveProperty("priceHistory");
  });

  it("serves a second getContestLobby call from cache", async () => {
    findFirst.mockResolvedValue(contestRow());

    const first = await getContestLobby(ADDRESS, null);
    const second = await getContestLobby(ADDRESS, null);

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("reloads after join invalidation", async () => {
    findFirst.mockResolvedValueOnce(contestRow()).mockResolvedValueOnce(
      contestRow({
        _count: { contestLineups: 2 },
      }),
    );

    const first = await getContestLobby(ADDRESS, null);
    invalidateContestLobbyByAddress(ADDRESS);
    const second = await getContestLobby(ADDRESS, null);

    expect(findFirst).toHaveBeenCalledTimes(2);
    expect((first as { _count: { contestLineups: number } })._count.contestLineups).toBe(1);
    expect((second as { _count: { contestLineups: number } })._count.contestLineups).toBe(2);
  });

  it("does not look up referral stakes for anonymous viewers", async () => {
    findFirst.mockResolvedValue(
      contestRow({ settings: { contestType: "PUBLIC", oracle: "0xoracle", referralNetworkBps: 500 } }),
    );

    const lobby = await loadContestLobby(ADDRESS, null);
    const lineups = lobby?.contestLineups as Array<{ referralStake?: unknown }>;

    expect(lineups[0]).not.toHaveProperty("referralStake");
    expect(userFindUnique).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("skips referral overlay when referralNetworkBps is 0", async () => {
    findFirst.mockResolvedValue(
      contestRow({ settings: { contestType: "PUBLIC", oracle: "0xoracle", referralNetworkBps: 0 } }),
    );

    await loadContestLobby(ADDRESS, "did:privy:1");

    expect(userFindUnique).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("does not expand contest.findFirst select for referral fields", async () => {
    findFirst.mockResolvedValue(contestRow());

    await loadContestLobby(ADDRESS, null);

    const select = findFirst.mock.calls[0]?.[0]?.select;
    expect(select.contestLineups.select.user.select).toEqual({
      id: true,
      name: true,
      settings: true,
    });
    expect(select.contestLineups.select.user.select).not.toHaveProperty("referredByUserId");
  });

  it("annotates lineups in the viewer's invite tree after the slim contest query", async () => {
    findFirst.mockResolvedValue(
      contestRow({ settings: { contestType: "PUBLIC", oracle: "0xoracle", referralNetworkBps: 500 } }),
    );
    userFindUnique.mockResolvedValue({
      id: "viewer-1",
      referralChainId: 84532,
      referralGroupId: "0x" + "ab".repeat(32),
      referredUsers: [{ referralChainId: 84532, referralGroupId: "0x" + "ab".repeat(32) }],
    });
    queryRaw.mockResolvedValue([{ leaf_id: "user-1", depth: 1 }]);

    const lobby = await loadContestLobby(ADDRESS, "did:privy:1");
    const lineups = lobby?.contestLineups as Array<{ userId: string; referralStake?: { depth: number } }>;

    expect(lineups[0]?.referralStake).toEqual({ depth: 1 });
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("does not re-run the referral overlay on a lobby cache hit", async () => {
    findFirst.mockResolvedValue(
      contestRow({ settings: { contestType: "PUBLIC", oracle: "0xoracle", referralNetworkBps: 500 } }),
    );
    userFindUnique.mockResolvedValue({
      id: "viewer-1",
      referralChainId: 84532,
      referralGroupId: "0x" + "ab".repeat(32),
      referredUsers: [{ referralChainId: 84532, referralGroupId: "0x" + "ab".repeat(32) }],
    });
    queryRaw.mockResolvedValue([{ leaf_id: "user-1", depth: 2 }]);

    const first = await getContestLobby(ADDRESS, "did:privy:stake");
    const second = await getContestLobby(ADDRESS, "did:privy:stake");

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(userFindUnique).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    const lineups = second?.contestLineups as Array<{ referralStake?: { depth: number } }>;
    expect(lineups[0]?.referralStake).toEqual({ depth: 2 });
  });
});

describe("slimParticipantMetadata", () => {
  it("keeps identity fields only", () => {
    expect(
      slimParticipantMetadata({
        firstName: "Max",
        lastName: "Verstappen",
        driverNumber: 1,
        teamName: "Red Bull",
        standings: { pos: 1 },
        dataGolf: { sg: 1 },
        quote: { last: 72 },
        sessionPriceHistory: [1],
        priceHistory: [1, 2, 3],
        gridPosition: 1,
      }),
    ).toEqual({
      firstName: "Max",
      lastName: "Verstappen",
      driverNumber: 1,
      teamName: "Red Bull",
    });
  });
});
