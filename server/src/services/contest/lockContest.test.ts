import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestState } from "../shared/types.js";

const {
  contestFindUnique,
  contestUpdate,
  readContestState,
  verifyOperator,
  lockContestWrite,
  confirmContestWrite,
} = vi.hoisted(() => ({
  contestFindUnique: vi.fn(),
  contestUpdate: vi.fn(),
  readContestState: vi.fn(),
  verifyOperator: vi.fn(),
  lockContestWrite: vi.fn(),
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

vi.mock("../shared/contractClient.js", () => ({
  getContestContract: () => ({
    write: { lockContest: lockContestWrite },
  }),
  verifyOperator,
  readContestState,
}));

vi.mock("./confirmContestWrite.js", () => ({
  confirmContestWrite,
}));

import { lockContest } from "./lockContest.js";

const HASH = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("lockContest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contestUpdate.mockResolvedValue({});
    verifyOperator.mockResolvedValue(true);
    lockContestWrite.mockResolvedValue(HASH);
    confirmContestWrite.mockResolvedValue({ status: "success" });
  });

  it("locks an off-chain contest without reading the chain", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-free",
      status: "ACTIVE",
      address: null,
      chainId: 8453,
    });

    await expect(lockContest("contest-free")).resolves.toEqual({
      success: true,
      contestId: "contest-free",
    });
    expect(readContestState).not.toHaveBeenCalled();
    expect(contestUpdate).toHaveBeenCalledWith({
      where: { id: "contest-free" },
      data: { status: "LOCKED" },
    });
  });

  it("does not update the row when the receipt reverts", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-paid",
      status: "ACTIVE",
      address: "0xabc",
      chainId: 8453,
    });
    readContestState.mockResolvedValue(ContestState.ACTIVE);
    confirmContestWrite.mockRejectedValue(new Error("transaction reverted"));

    await expect(lockContest("contest-paid")).resolves.toMatchObject({ success: false });
    expect(contestUpdate).not.toHaveBeenCalled();
  });

  it("aligns an ACTIVE row when the chain is already LOCKED", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-paid",
      status: "ACTIVE",
      address: "0xabc",
      chainId: 8453,
    });
    readContestState.mockResolvedValue(ContestState.LOCKED);

    await expect(lockContest("contest-paid")).resolves.toEqual({
      success: true,
      contestId: "contest-paid",
    });
    expect(lockContestWrite).not.toHaveBeenCalled();
    expect(contestUpdate).toHaveBeenCalledWith({
      where: { id: "contest-paid" },
      data: { status: "LOCKED" },
    });
  });

  it("updates the row only after the chain confirms LOCKED", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-paid",
      status: "ACTIVE",
      address: "0xabc",
      chainId: 8453,
    });
    readContestState.mockResolvedValue(ContestState.ACTIVE);
    const order: string[] = [];
    confirmContestWrite.mockImplementation(async () => {
      order.push("confirm");
      return { status: "success" };
    });
    contestUpdate.mockImplementation(async () => {
      order.push("update");
      return {};
    });

    await expect(lockContest("contest-paid")).resolves.toMatchObject({
      success: true,
      transactionHash: HASH,
    });
    expect(order).toEqual(["confirm", "update"]);
  });
});
