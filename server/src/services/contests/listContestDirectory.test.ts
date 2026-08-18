import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contest: { findMany },
  },
}));

import {
  getContestDirectory,
  invalidateContestDirectory,
  listContestDirectory,
} from "./listContestDirectory.js";

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
      status: "SCHEDULED",
      startDate: "2026-03-01",
      endDate: "2026-03-04",
      course: "Test National",
      city: "Testville",
      state: "FL",
      beautyImage: "https://example.com/hero.png",
      summarySections: [{ heading: "Preview", body: "long copy" }],
      weather: { huge: true },
      ...overrides,
    },
  };
}

function contestRow(event: ReturnType<typeof golfEvent>, overrides: Record<string, unknown> = {}) {
  return {
    id: "contest-1",
    name: "Main",
    eventId: event.id,
    userGroupId: null,
    endTime: new Date("2026-03-04T00:00:00.000Z"),
    address: "0xabc",
    chainId: 84532,
    status: "OPEN",
    settings: {
      contestType: "PUBLIC",
      chainId: 84532,
      primaryDeposit: 25,
      paymentTokenAddress: "0xtoken",
      paymentTokenSymbol: "USDC",
      extraUnused: "drop-me",
    },
    results: null,
    userGroup: null,
    _count: { contestLineups: 4 },
    event,
    ...overrides,
  };
}

describe("listContestDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateContestDirectory();
  });

  it("issues one contest.findMany and public-only visibility when anonymous", async () => {
    findMany.mockResolvedValue([contestRow(golfEvent())]);

    await listContestDirectory(null, "all", 84532);

    expect(findMany).toHaveBeenCalledTimes(1);
    const where = findMany.mock.calls[0]?.[0]?.where;
    expect(where.OR).toEqual([{ userGroupId: null }]);
    expect(where.chainId).toBe(84532);
    expect(where.event.sport).toEqual({ isEnabled: true });
  });

  it("includes membership filter for a signed-in Privy user", async () => {
    findMany.mockResolvedValue([contestRow(golfEvent())]);

    await listContestDirectory("did:privy:1", "all", 84532);

    const where = findMany.mock.calls[0]?.[0]?.where;
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

  it("strips summarySections and unused settings from the directory payload", async () => {
    findMany.mockResolvedValue([contestRow(golfEvent())]);

    const directory = await listContestDirectory(null, "all", 84532);
    const event = directory.upcoming[0]?.event;
    const contest = directory.upcoming[0]?.contests[0];

    expect(event?.metadata).toMatchObject({
      name: "Test Open",
      status: "SCHEDULED",
      course: "Test National",
      beautyImage: "https://example.com/hero.png",
    });
    expect(event?.metadata).not.toHaveProperty("summarySections");
    expect(event?.metadata).not.toHaveProperty("weather");
    expect(contest?.settings).toMatchObject({
      primaryDeposit: 25,
      paymentTokenAddress: "0xtoken",
    });
    expect(contest?.settings).not.toHaveProperty("extraUnused");
    expect(contest).not.toHaveProperty("results");
    expect(contest?._count.contestLineups).toBe(4);
  });

  it("serves a second getContestDirectory call from cache", async () => {
    findMany.mockResolvedValue([contestRow(golfEvent())]);

    const first = await getContestDirectory(null, "all", 84532);
    const second = await getContestDirectory(null, "all", 84532);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });
});
