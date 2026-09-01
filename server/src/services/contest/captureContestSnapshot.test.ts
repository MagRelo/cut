import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { readContract } = vi.hoisted(() => ({
  readContract: vi.fn(),
}));

vi.mock("../shared/contractClient.js", () => ({
  getPublicClient: () => ({ readContract }),
}));

import {
  captureContestSnapshot,
  capturePreSettleSnapshot,
  contestSnapshotFromBalances,
} from "./captureContestSnapshot.js";

const ADDRESS = "0x56268B14acAbf3c9b5B4140262c222c0D740e3Ad";
const TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SETTLE_BLOCK = 50669538n;
const PRE_BLOCK = 50669537n;

function mockPreSettleReads() {
  readContract.mockImplementation(({ functionName }: { functionName: string }) => {
    const values: Record<string, unknown> = {
      primaryPrizePool: 232800000n,
      getPrimarySideBalance: 232800000n,
      getSecondarySideBalance: 7200000n,
      totalSecondaryLiquidity: 7200000n,
      primaryDepositSecondarySubsidyBps: 300n,
      paymentToken: TOKEN,
      balanceOf: 240000000n,
    };
    return values[functionName];
  });
}

describe("contestSnapshotFromBalances", () => {
  it("sets grossTvlWei to primary + secondary", () => {
    const snapshot = contestSnapshotFromBalances({
      contractBalance: 240000000n,
      primaryPrizePool: 232800000n,
      primarySideBalance: 232800000n,
      secondarySideBalance: 7200000n,
      totalSecondaryLiquidity: 7200000n,
      primaryDepositSecondarySubsidyBps: 300,
    });
    expect(snapshot.grossTvlWei).toBe("240000000");
  });
});

describe("captureContestSnapshot", () => {
  beforeEach(() => {
    readContract.mockReset();
  });

  it("pins reads to the requested block", async () => {
    mockPreSettleReads();

    const { snapshot, paymentTokenAddress } = await captureContestSnapshot(
      ADDRESS,
      8453,
      PRE_BLOCK,
    );

    expect(paymentTokenAddress).toBe(TOKEN);
    expect(snapshot.grossTvlWei).toBe("240000000");
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getPrimarySideBalance",
        blockNumber: PRE_BLOCK,
      }),
    );
  });
});

describe("capturePreSettleSnapshot", () => {
  beforeEach(() => {
    readContract.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pins snapshot to settleBlock - 1n", async () => {
    mockPreSettleReads();

    const { snapshot } = await capturePreSettleSnapshot(ADDRESS, 8453, SETTLE_BLOCK);

    expect(snapshot.grossTvlWei).toBe("240000000");
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getPrimarySideBalance",
        blockNumber: PRE_BLOCK,
      }),
    );
  });

  it("retries the pre-settle block when the RPC has not indexed it", async () => {
    vi.useFakeTimers();
    const blockNotFound = Object.assign(new Error("Requested resource not found."), {
      details: `block not found: 0x${PRE_BLOCK.toString(16)}`,
    });
    readContract.mockRejectedValueOnce(blockNotFound);
    mockPreSettleReads();

    const pending = capturePreSettleSnapshot(ADDRESS, 8453, SETTLE_BLOCK);
    await vi.runAllTimersAsync();
    const { snapshot } = await pending;

    expect(snapshot.grossTvlWei).toBe("240000000");
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getPrimarySideBalance",
        blockNumber: PRE_BLOCK,
      }),
    );
  });
});
