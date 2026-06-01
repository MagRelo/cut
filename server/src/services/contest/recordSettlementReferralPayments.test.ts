import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TransactionReceipt } from "viem";
import { encodeEventTopics, encodeAbiParameters, parseAbiParameters } from "viem";
import { recordSettlementReferralPayments } from "./recordSettlementReferralPayments.js";

const insertMock = vi.fn().mockResolvedValue(undefined);
const resolveUserMock = vi.fn().mockResolvedValue("user-1");
const oracleReadMock = vi.fn().mockResolvedValue("0x1111111111111111111111111111111111111111");

vi.mock("./onchainPayment.js", () => ({
  insertOnchainPaymentRow: (...args: unknown[]) => insertMock(...args),
  resolveUserIdForWallet: (...args: unknown[]) => resolveUserMock(...args),
}));

vi.mock("../shared/contractClient.js", () => ({
  getContestContract: () => ({
    read: { oracle: oracleReadMock },
  }),
}));

vi.mock("../../lib/referralConfig.js", () => ({
  parseReferralGroupIdFromEnv: () => "0x" + "ab".repeat(32),
}));

function makeReceipt(logs: TransactionReceipt["logs"]): TransactionReceipt {
  return {
    blockHash: "0x" + "00".repeat(32),
    blockNumber: 1n,
    contractAddress: null,
    cumulativeGasUsed: 0n,
    effectiveGasPrice: 0n,
    from: "0x" + "00".repeat(20),
    gasUsed: 0n,
    logs,
    logsBloom: "0x" + "00".repeat(256),
    status: "success",
    to: null,
    transactionHash: "0x" + "aa".repeat(32),
    transactionIndex: 0,
    type: "eip1559",
  } as TransactionReceipt;
}

describe("recordSettlementReferralPayments", () => {
  beforeEach(() => {
    insertMock.mockClear();
    resolveUserMock.mockClear();
  });

  it("records one row per ChainRewardsDistributed recipient", async () => {
    const distributor = "0x2222222222222222222222222222222222222222";
    const payoutAnchor = "0x3333333333333333333333333333333333333333";
    const ref0 = "0x4444444444444444444444444444444444444444";
    const ref1 = "0x5555555555555555555555555555555555555555";
    const eventId = "0x" + "ee".repeat(32);

    const topics = encodeEventTopics({
      abi: [
        {
          type: "event",
          name: "ChainRewardsDistributed",
          inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "totalAmount", type: "uint256", indexed: false },
            { name: "eventId", type: "bytes32", indexed: true },
            { name: "recipients", type: "address[]", indexed: false },
            { name: "amounts", type: "uint256[]", indexed: false },
          ],
        },
      ],
      eventName: "ChainRewardsDistributed",
      args: { user: payoutAnchor as `0x${string}`, eventId: eventId as `0x${string}` },
    });

    const data = encodeAbiParameters(parseAbiParameters("uint256, address[], uint256[]"), [
      1000n,
      [ref0, ref1],
      [600n, 400n],
    ]);

    const receipt = makeReceipt([
      {
        address: distributor as `0x${string}`,
        topics: topics as [`0x${string}`, ...`0x${string}`[]],
        data: data as `0x${string}`,
        blockHash: `0x${"00".repeat(32)}`,
        blockNumber: 1n,
        logIndex: 5,
        transactionHash: `0x${"aa".repeat(32)}`,
        transactionIndex: 0,
        removed: false,
      },
    ]);

    const result = await recordSettlementReferralPayments({
      contestId: "c1",
      chainId: 84532,
      contestAddress: "0x6666666666666666666666666666666666666666",
      paymentTokenAddress: "0x7777777777777777777777777777777777777777",
      settleReceipt: receipt,
      rewardDistributorAddress: distributor as `0x${string}`,
    });

    expect(result.referralRowCount).toBe(2);
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(insertMock.mock.calls[0]?.[0]).toMatchObject({
      kind: "REFERRAL",
      walletAddress: ref0,
      amountWei: "600",
      logIndex: 5,
    });
  });

  it("records oracle fallback from ReferralNetworkFeeToOracle", async () => {
    const contest = "0x6666666666666666666666666666666666666666";
    const topics = encodeEventTopics({
      abi: [
        {
          type: "event",
          name: "ReferralNetworkFeeToOracle",
          inputs: [
            { name: "winner", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
          ],
        },
      ],
      eventName: "ReferralNetworkFeeToOracle",
      args: { winner: "0x8888888888888888888888888888888888888888" },
    });

    const data = encodeAbiParameters(parseAbiParameters("uint256"), [500n]);

    const receipt = makeReceipt([
      {
        address: contest as `0x${string}`,
        topics: topics as [`0x${string}`, ...`0x${string}`[]],
        data: data as `0x${string}`,
        blockHash: `0x${"00".repeat(32)}`,
        blockNumber: 1n,
        logIndex: 2,
        transactionHash: `0x${"aa".repeat(32)}`,
        transactionIndex: 0,
        removed: false,
      },
    ]);

    const result = await recordSettlementReferralPayments({
      contestId: "c1",
      chainId: 84532,
      contestAddress: contest,
      paymentTokenAddress: "0x7777777777777777777777777777777777777777",
      settleReceipt: receipt,
      rewardDistributorAddress: "0x2222222222222222222222222222222222222222",
    });

    expect(result.referralRowCount).toBe(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "REFERRAL",
        amountWei: "500",
        metadata: expect.objectContaining({ path: "oracle" }),
      }),
    );
  });
});
