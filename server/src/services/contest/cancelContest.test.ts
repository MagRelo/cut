import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestState } from "../shared/types.js";

const {
  contestFindUnique,
  contestUpdate,
  readContestState,
  verifyOperator,
  cancelContestWrite,
  confirmContestWrite,
} = vi.hoisted(() => ({
  contestFindUnique: vi.fn(),
  contestUpdate: vi.fn(),
  readContestState: vi.fn(),
  verifyOperator: vi.fn(),
  cancelContestWrite: vi.fn(),
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
    write: { cancelContest: cancelContestWrite },
  }),
  verifyOperator,
  readContestState,
}));

vi.mock("./confirmContestWrite.js", () => ({
  confirmContestWrite,
}));

import { cancelContest } from "./cancelContest.js";

const HASH = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

describe("cancelContest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contestUpdate.mockResolvedValue({});
    verifyOperator.mockResolvedValue(true);
    cancelContestWrite.mockResolvedValue(HASH);
    confirmContestWrite.mockResolvedValue({ status: "success" });
  });

  it("cancels an off-chain contest without reading the chain", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-free",
      status: "OPEN",
      address: null,
      chainId: 8453,
      results: null,
    });

    await expect(cancelContest("contest-free")).resolves.toEqual({
      success: true,
      contestId: "contest-free",
    });
    expect(readContestState).not.toHaveBeenCalled();
    expect(contestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "contest-free" },
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
  });

  it("does not update the row when the receipt reverts", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-paid",
      status: "OPEN",
      address: "0xabc",
      chainId: 8453,
      results: null,
    });
    readContestState.mockResolvedValue(ContestState.OPEN);
    confirmContestWrite.mockRejectedValue(new Error("transaction reverted"));

    await expect(cancelContest("contest-paid")).resolves.toMatchObject({ success: false });
    expect(contestUpdate).not.toHaveBeenCalled();
  });

  it("aligns the row when the chain is already CANCELLED and keeps existing results", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-paid",
      status: "ACTIVE",
      address: "0xabc",
      chainId: 8453,
      results: { note: "keep-me", reason: "expired" },
    });
    readContestState.mockResolvedValue(ContestState.CANCELLED);

    await expect(cancelContest("contest-paid", "admin")).resolves.toEqual({
      success: true,
      contestId: "contest-paid",
    });
    expect(cancelContestWrite).not.toHaveBeenCalled();
    expect(contestUpdate).toHaveBeenCalledWith({
      where: { id: "contest-paid" },
      data: {
        status: "CANCELLED",
        results: expect.objectContaining({
          note: "keep-me",
          reason: "expired",
          cancelled: true,
          alignedToChain: true,
        }),
      },
    });
    const results = contestUpdate.mock.calls[0]?.[0].data.results;
    expect(results.cancelTx).toBeUndefined();
  });

  it("updates the row only after the chain confirms CANCELLED", async () => {
    contestFindUnique.mockResolvedValue({
      id: "contest-paid",
      status: "OPEN",
      address: "0xabc",
      chainId: 8453,
      results: null,
    });
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

    await expect(cancelContest("contest-paid")).resolves.toMatchObject({
      success: true,
      transactionHash: HASH,
    });
    expect(order).toEqual(["confirm", "update"]);
    expect(contestUpdate.mock.calls[0]?.[0].data.results).toEqual(
      expect.objectContaining({
        cancelTx: { hash: HASH },
        cancelled: true,
      }),
    );
  });
});
