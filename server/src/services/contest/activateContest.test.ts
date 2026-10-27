import { beforeEach, describe, expect, it, vi } from "vitest";

const { contestFindUnique, contestUpdate, getEventStatus, readContestState } = vi.hoisted(() => ({
  contestFindUnique: vi.fn(),
  contestUpdate: vi.fn(),
  getEventStatus: vi.fn(),
  readContestState: vi.fn(),
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
    shouldActivateContest: (status: string) => status === "LIVE",
  }),
}));

vi.mock("../shared/contractClient.js", () => ({
  getContestContract: vi.fn(),
  verifyOperator: vi.fn(),
  readContestState,
}));

import { activateContest } from "./activateContest.js";

const event = { id: "event-1", sportId: "pga-golf" };

describe("activateContest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEventStatus.mockResolvedValue("LIVE");
    contestUpdate.mockResolvedValue({});
  });

  it("activates an off-chain contest that has no entries", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-free",
      status: "OPEN",
      address: null,
      chainId: 8453,
      eventId: event.id,
      event,
      contestLineups: [],
    });

    await expect(activateContest("contest-free")).resolves.toEqual({
      success: true,
      contestId: "contest-free",
    });

    expect(contestUpdate).toHaveBeenCalledWith({
      where: { id: "contest-free" },
      data: { status: "ACTIVE" },
    });
    expect(readContestState).not.toHaveBeenCalled();
  });

  it("still refuses an on-chain contest that has no entries", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-paid",
      status: "OPEN",
      address: "0xabc",
      chainId: 8453,
      eventId: event.id,
      event,
      contestLineups: [],
    });

    await expect(activateContest("contest-paid")).resolves.toEqual({
      success: false,
      contestId: "contest-paid",
      error: "Contest has no entries",
    });
    expect(contestUpdate).not.toHaveBeenCalled();
  });
});
