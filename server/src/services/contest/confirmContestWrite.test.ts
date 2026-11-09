import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestState } from "../shared/types.js";

const { waitForTransactionReceipt, waitForContestState } = vi.hoisted(() => ({
  waitForTransactionReceipt: vi.fn(),
  waitForContestState: vi.fn(),
}));

vi.mock("../shared/contractClient.js", () => ({
  getPublicClient: () => ({ waitForTransactionReceipt }),
}));

vi.mock("./waitForContestState.js", () => ({
  waitForContestState,
}));

import { confirmContestWrite } from "./confirmContestWrite.js";

const ADDRESS = "0x56268B14acAbf3c9b5B4140262c222c0D740e3Ad";
const HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

describe("confirmContestWrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the receipt reverted and does not read state", async () => {
    waitForTransactionReceipt.mockResolvedValue({ status: "reverted", transactionHash: HASH });

    await expect(
      confirmContestWrite({
        contestAddress: ADDRESS,
        chainId: 8453,
        hash: HASH,
        expected: ContestState.ACTIVE,
      }),
    ).rejects.toThrow(`transaction reverted: ${HASH}`);
    expect(waitForContestState).not.toHaveBeenCalled();
  });

  it("throws when the receipt succeeded but state() never matches", async () => {
    waitForTransactionReceipt.mockResolvedValue({ status: "success", transactionHash: HASH });
    waitForContestState.mockResolvedValue(ContestState.OPEN);

    await expect(
      confirmContestWrite({
        contestAddress: ADDRESS,
        chainId: 8453,
        hash: HASH,
        expected: ContestState.ACTIVE,
      }),
    ).rejects.toThrow(`Contract state is ${ContestState.OPEN} after tx ${HASH}`);
  });

  it("returns the receipt when state() matches", async () => {
    const receipt = { status: "success", transactionHash: HASH };
    waitForTransactionReceipt.mockResolvedValue(receipt);
    waitForContestState.mockResolvedValue(ContestState.ACTIVE);

    await expect(
      confirmContestWrite({
        contestAddress: ADDRESS,
        chainId: 8453,
        hash: HASH,
        expected: ContestState.ACTIVE,
      }),
    ).resolves.toBe(receipt);
  });
});
