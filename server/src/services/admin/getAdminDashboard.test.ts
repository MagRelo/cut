import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveAdminEvents, userCount, eventCount, contestFindMany, userGroupFindMany } =
  vi.hoisted(() => ({
    resolveAdminEvents: vi.fn(),
    userCount: vi.fn(),
    eventCount: vi.fn(),
    contestFindMany: vi.fn(),
    userGroupFindMany: vi.fn(),
  }));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { count: userCount },
    competitionEvent: { count: eventCount },
    contest: { findMany: contestFindMany },
    userGroup: { findMany: userGroupFindMany },
    contestLineup: { count: vi.fn() },
    lineup: { count: vi.fn() },
  },
}));

vi.mock("./adminEventContext.js", async () => {
  const actual = await vi.importActual<typeof import("./adminEventContext.js")>(
    "./adminEventContext.js",
  );
  return { ...actual, resolveAdminEvents };
});

import { getAdminDashboard } from "./getAdminDashboard.js";

describe("getAdminDashboard platform stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAdminEvents.mockResolvedValue([]);
    userCount.mockImplementation(async (args?: { where?: { createdAt?: unknown } }) =>
      args?.where?.createdAt ? 7 : 128,
    );
    eventCount.mockResolvedValue(2);
    contestFindMany.mockResolvedValue([
      { settings: { primaryDeposit: 10 }, userGroupId: null, _count: { contestLineups: 3 } },
      { settings: { primaryDeposit: 25 }, userGroupId: "lg-1", _count: { contestLineups: 2 } },
    ]);
    userGroupFindMany.mockResolvedValue([
      {
        id: "lg-1",
        name: "Clubhouse",
        description: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        _count: { members: 4, contests: 1 },
      },
    ]);
  });

  it("returns user, live event, live contest cash, and league totals from the database", async () => {
    const result = await getAdminDashboard();

    expect(result.stats).toEqual({
      userCount: 128,
      newUsersThisWeek: 7,
      liveEventCount: 2,
      liveContestCount: 2,
      liveContestCash: 80,
      liveLeagueContestCount: 1,
      leagueCount: 1,
    });
    expect(userCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { gte: expect.any(Date) } },
      }),
    );
    expect(result.leagues).toEqual([
      {
        id: "lg-1",
        name: "Clubhouse",
        description: null,
        memberCount: 4,
        contestCount: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(contestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ["OPEN", "ACTIVE", "LOCKED"] },
          event: { isActive: true },
        },
      }),
    );
  });

  it("treats missing or invalid primaryDeposit as zero cash", async () => {
    contestFindMany.mockResolvedValue([
      { settings: null, userGroupId: null, _count: { contestLineups: 4 } },
      { settings: { primaryDeposit: "free" }, userGroupId: "lg-1", _count: { contestLineups: 2 } },
    ]);

    const result = await getAdminDashboard();

    expect(result.stats.liveContestCount).toBe(2);
    expect(result.stats.liveContestCash).toBe(0);
  });
});
