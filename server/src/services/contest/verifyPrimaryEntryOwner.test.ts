import { beforeEach, describe, expect, it, vi } from "vitest";
import { zeroAddress } from "viem";

const { readContract } = vi.hoisted(() => ({
  readContract: vi.fn(),
}));

vi.mock("../shared/contractClient.js", () => ({
  getPublicClient: () => ({ readContract }),
}));

import { verifyPrimaryEntryOwner } from "./verifyPrimaryEntryOwner.js";

const CONTEST = "0x1111111111111111111111111111111111111111";
const WALLET = "0x2222222222222222222222222222222222222222";

describe("verifyPrimaryEntryOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts when entryOwner matches the wallet", async () => {
    readContract.mockResolvedValue(WALLET);

    const result = await verifyPrimaryEntryOwner({
      contestAddress: CONTEST,
      chainId: 84532,
      entryId: "123",
      walletAddress: WALLET,
    });

    expect(result).toEqual({ ok: true, owner: WALLET });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "entryOwner",
        args: [123n],
      }),
    );
  });

  it("rejects the zero address", async () => {
    readContract.mockResolvedValue(zeroAddress);

    const result = await verifyPrimaryEntryOwner({
      contestAddress: CONTEST,
      chainId: 84532,
      entryId: "123",
      walletAddress: WALLET,
    });

    expect(result).toEqual({ ok: false, error: "unowned" });
  });

  it("rejects a different owner", async () => {
    readContract.mockResolvedValue("0x3333333333333333333333333333333333333333");

    const result = await verifyPrimaryEntryOwner({
      contestAddress: CONTEST,
      chainId: 84532,
      entryId: "123",
      walletAddress: WALLET,
    });

    expect(result).toEqual({ ok: false, error: "not_owner" });
  });
});
