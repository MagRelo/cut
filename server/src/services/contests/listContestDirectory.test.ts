import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, findEvents } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findEvents: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contest: { findMany },
    competitionEvent: { findMany: findEvents },
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
      summarySections: [{ title: "Preview", items: [{ body: "long copy" }] }],
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
    onchainPayments: [],
    event,
    ...overrides,
  };
}

describe("listContestDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateContestDirectory();
    findEvents.mockResolvedValue([]);
  });

  it("issues one contest.findMany and public-only visibility when anonymous", async () => {
    findMany.mockResolvedValue([contestRow(golfEvent())]);

    await listContestDirectory(null, "all");

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findEvents).toHaveBeenCalledTimes(1);
    const where = findMany.mock.calls[0]?.[0]?.where;
    expect(where.OR).toEqual([{ userGroupId: null }]);
    expect(where.chainId).toBeUndefined();
    expect(where.event.sport).toEqual({ isEnabled: true });
    expect(findEvents.mock.calls[0]?.[0]?.where.sport).toEqual({ isEnabled: true });
  });

  it("includes membership filter for a signed-in Privy user", async () => {
    findMany.mockResolvedValue([contestRow(golfEvent())]);

    await listContestDirectory("did:privy:1", "all");

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

  it("keeps summarySections and strips unused settings from the directory payload", async () => {
    findMany.mockResolvedValue([contestRow(golfEvent())]);

    const directory = await listContestDirectory(null, "all");
    const event = directory.upcoming[0]?.event;
    const contest = directory.upcoming[0]?.contests[0];

    expect(event?.metadata).toMatchObject({
      name: "Test Open",
      status: "SCHEDULED",
      course: "Test National",
      beautyImage: "https://example.com/hero.png",
      summarySections: [{ title: "Preview", items: [{ body: "long copy" }] }],
    });
    expect(event?.metadata).not.toHaveProperty("weather");
    expect(contest?.settings).toMatchObject({
      primaryDeposit: 25,
      paymentTokenAddress: "0xtoken",
    });
    expect(contest?.settings).not.toHaveProperty("extraUnused");
    expect(contest).not.toHaveProperty("results");
    expect(contest?._count.contestLineups).toBe(4);
    expect(contest?.settledPot).toBeNull();
  });

  it("requests payment amountWei on the directory select", async () => {
    findMany.mockResolvedValue([contestRow(golfEvent())]);

    await listContestDirectory(null, "all");

    expect(findMany.mock.calls[0]?.[0]?.select.onchainPayments).toEqual({
      select: { amountWei: true },
    });
  });

  it("sets settledPot from the payment ledger", async () => {
    findMany.mockResolvedValue([
      contestRow(golfEvent(), {
        status: "SETTLED",
        onchainPayments: [
          { amountWei: "10500000" },
          { amountWei: "6300000" },
          { amountWei: "156240000" },
          { amountWei: "44640000" },
          { amountWei: "22320000" },
        ],
      }),
    ]);

    const directory = await listContestDirectory(null, "all");
    expect(directory.upcoming[0]?.contests[0]?.settledPot).toBe(240);
  });

  it("does not use live payment rows for unsettled contests", async () => {
    findMany.mockResolvedValue([
      contestRow(golfEvent(), {
        onchainPayments: [{ amountWei: "240000000" }],
      }),
    ]);

    const directory = await listContestDirectory(null, "all");
    expect(directory.upcoming[0]?.contests[0]?.settledPot).toBeNull();
  });

  it("serves a second getContestDirectory call from cache", async () => {
    findMany.mockResolvedValue([contestRow(golfEvent())]);

    const first = await getContestDirectory(null, "all");
    const second = await getContestDirectory(null, "all");

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findEvents).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("lists an active upcoming event with no contests", async () => {
    findMany.mockResolvedValue([]);
    findEvents.mockResolvedValue([
      golfEvent({
        status: "NOT_STARTED",
        startDate: "2026-09-17T12:00:00.000Z",
        endDate: "2026-09-20T22:00:00.000Z",
      }),
    ]);

    const directory = await listContestDirectory(null, "all");

    expect(directory.upcoming).toHaveLength(1);
    expect(directory.upcoming[0]?.event.name).toBe("Test Open");
    expect(directory.upcoming[0]?.contests).toEqual([]);
    expect(directory.live).toEqual([]);
    expect(directory.past).toEqual([]);
  });

  it("omits a live event that has no contests", async () => {
    findMany.mockResolvedValue([]);
    findEvents.mockResolvedValue([
      golfEvent({
        status: "IN_PROGRESS",
        startDate: "2026-08-31T12:00:00.000Z",
        endDate: "2026-09-04T22:00:00.000Z",
      }),
    ]);

    const directory = await listContestDirectory(null, "all");

    expect(directory.upcoming).toEqual([]);
    expect(directory.live).toEqual([]);
    expect(directory.past).toEqual([]);
  });

  it("omits a completed event that has no contests", async () => {
    findMany.mockResolvedValue([]);
    findEvents.mockResolvedValue([
      golfEvent({
        status: "COMPLETED",
        startDate: "2026-08-27T12:00:00.000Z",
        endDate: "2026-08-30T22:00:00.000Z",
      }),
    ]);

    const directory = await listContestDirectory(null, "all");

    expect(directory.upcoming).toEqual([]);
    expect(directory.live).toEqual([]);
    expect(directory.past).toEqual([]);
  });

  it("omits inactive stub events whose dates have already passed", async () => {
    findMany.mockResolvedValue([]);
    findEvents.mockResolvedValue([
      {
        ...golfEvent({
          status: "",
          startDate: "2026-04-06T15:34:58.000Z",
          endDate: "2026-04-06T15:34:58.000Z",
        }),
        isActive: false,
      },
    ]);

    const directory = await listContestDirectory(null, "all");

    expect(directory.upcoming).toEqual([]);
    expect(directory.live).toEqual([]);
    expect(directory.past).toEqual([]);
  });
});
