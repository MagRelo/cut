import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  contestFindUnique,
  contestUpdate,
  getEventStatus,
  readContestState,
  verifyOperator,
  activateContestWrite,
  confirmContestWrite,
} = vi.hoisted(() => ({
  contestFindUnique: vi.fn(),
  contestUpdate: vi.fn(),
  getEventStatus: vi.fn(),
  readContestState: vi.fn(),
  verifyOperator: vi.fn(),
  activateContestWrite: vi.fn(),
  confirmContestWrite: vi.fn(),
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
  getContestContract: () => ({
    write: { activateContest: activateContestWrite },
  }),
  verifyOperator,
  readContestState,
}));

vi.mock("./confirmContestWrite.js", () => ({
  confirmContestWrite,
}));

import { activateContest } from "./activateContest.js";
import { ContestState } from "../shared/types.js";

const event = { id: "event-1", sportId: "pga-golf" };

describe("activateContest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEventStatus.mockResolvedValue("LIVE");
    contestUpdate.mockResolvedValue({});
    verifyOperator.mockResolvedValue(true);
    activateContestWrite.mockResolvedValue(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    confirmContestWrite.mockResolvedValue({ status: "success" });
  });

  function paidOpenContest() {
    return {
      id: "contest-paid",
      status: "OPEN",
      address: "0xabc",
      chainId: 8453,
      eventId: event.id,
      event,
      contestLineups: [{ id: "lineup-1" }],
    };
  }

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

  it("does not update the row when the receipt reverts", async () => {
    contestFindUnique.mockResolvedValue(paidOpenContest());
    readContestState.mockResolvedValue(ContestState.OPEN);
    confirmContestWrite.mockRejectedValue(new Error("transaction reverted: 0xabc"));

    await expect(activateContest("contest-paid")).resolves.toMatchObject({
      success: false,
      contestId: "contest-paid",
    });
    expect(contestUpdate).not.toHaveBeenCalled();
  });

  it("aligns an OPEN row when the chain is already ACTIVE", async () => {
    contestFindUnique.mockResolvedValue(paidOpenContest());
    readContestState.mockResolvedValue(ContestState.ACTIVE);

    await expect(activateContest("contest-paid")).resolves.toEqual({
      success: true,
      contestId: "contest-paid",
    });
    expect(activateContestWrite).not.toHaveBeenCalled();
    expect(confirmContestWrite).not.toHaveBeenCalled();
    expect(contestUpdate).toHaveBeenCalledWith({
      where: { id: "contest-paid" },
      data: { status: "ACTIVE" },
    });
  });

  it("updates the row only after the chain confirms ACTIVE", async () => {
    contestFindUnique.mockResolvedValue(paidOpenContest());
    readContestState.mockResolvedValue(ContestState.OPEN);
    const order: string[] = [];
    confirmContestWrite.mockImplementation(async () => {
      order.push("confirm");
      return { status: "success" };
    });
    contestUpdate.mockImplementation(async () => {
      order.push("update");
      return {};
    });

    await expect(activateContest("contest-paid")).resolves.toMatchObject({
      success: true,
      contestId: "contest-paid",
      transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(order).toEqual(["confirm", "update"]);
    expect(contestUpdate).toHaveBeenCalledWith({
      where: { id: "contest-paid" },
      data: { status: "ACTIVE" },
    });
  });

  it("does not adopt a chain state other than ACTIVE", async () => {
    contestFindUnique.mockResolvedValue(paidOpenContest());
    readContestState.mockResolvedValue(ContestState.LOCKED);

    await expect(activateContest("contest-paid")).resolves.toMatchObject({
      success: false,
    });
    expect(activateContestWrite).not.toHaveBeenCalled();
    expect(contestUpdate).not.toHaveBeenCalled();
  });
});
