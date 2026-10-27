import { beforeEach, describe, expect, it, vi } from "vitest";

const { contestFindUnique, contestUpdate, getEventStatus } = vi.hoisted(() => ({
  contestFindUnique: vi.fn(),
  contestUpdate: vi.fn(),
  getEventStatus: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contest: {
      findUnique: contestFindUnique,
      update: contestUpdate,
    },
  },
}));

vi.mock("../../sports/registry.js", () => ({
  requireSportModule: () => ({
    getEventStatus,
    shouldSettleContest: (status: string) => status === "COMPLETE",
  }),
}));

import { settleContest } from "./settleContest.js";

describe("settleContest empty off-chain contest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEventStatus.mockResolvedValue("COMPLETE");
    contestUpdate.mockResolvedValue({});
  });

  it("settles a $0 contest that never received an entry", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-free",
      status: "ACTIVE",
      address: null,
      chainId: 8453,
      eventId: "event-1",
      event: { id: "event-1", sportId: "pga-golf" },
      contestLineups: [],
    });

    await expect(settleContest("contest-free")).resolves.toEqual({
      success: true,
      contestId: "contest-free",
    });

    expect(contestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "contest-free" },
        data: { status: "LOCKED" },
      }),
    );
    expect(contestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "contest-free" },
        data: expect.objectContaining({ status: "SETTLED" }),
      }),
    );
  });
});
