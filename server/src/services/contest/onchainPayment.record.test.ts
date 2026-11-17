import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
  type TransactionReceipt,
} from "viem";
import ContestController from "../../contracts/ContestController.json" with { type: "json" };

const { createMany, findMany, update, findFirst, findUnique, loadTransactionReceipt, readContestPaymentToken } =
  vi.hoisted(() => ({
    createMany: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    loadTransactionReceipt: vi.fn(),
    readContestPaymentToken: vi.fn(),
  }));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    onchainPayment: { createMany, findMany, update },
    userWallet: { findFirst },
    contest: { findUnique },
  },
}));

vi.mock("../../lib/contractAddresses.js", () => ({
  getPaymentTokenAddress: () => "0x3333333333333333333333333333333333333333",
}));

vi.mock("./verifyValueTransferReceipt.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./verifyValueTransferReceipt.js")>();
  return {
    ...actual,
    loadTransactionReceipt,
    readContestPaymentToken,
  };
});

import { recordValueTransfer, ValueTransferError } from "./onchainPayment.js";

const FROM = "0x1111111111111111111111111111111111111111";
const TO = "0x2222222222222222222222222222222222222222";
const OTHER = "0x4444444444444444444444444444444444444444";
const TOKEN = "0x3333333333333333333333333333333333333333";
const HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const transferAbi = [
  {
    type: "event" as const,
    name: "Transfer" as const,
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
];

function receiptWith(logs: TransactionReceipt["logs"]): TransactionReceipt {
  return {
    blockHash: "0x" + "00".repeat(32),
    blockNumber: 1n,
    contractAddress: null,
    cumulativeGasUsed: 0n,
    effectiveGasPrice: 0n,
    from: FROM,
    gasUsed: 0n,
    logs,
    logsBloom: "0x" + "00".repeat(256),
    status: "success",
    to: TO,
    transactionHash: HASH,
    transactionIndex: 0,
    type: "eip1559",
  } as TransactionReceipt;
}

function transferLog(params: { from: string; to: string; token?: string; amount: bigint; logIndex: number }) {
  const token = (params.token ?? TOKEN) as `0x${string}`;
  const topics = encodeEventTopics({
    abi: transferAbi,
    eventName: "Transfer",
    args: { from: params.from as `0x${string}`, to: params.to as `0x${string}` },
  });
  const data = encodeAbiParameters(parseAbiParameters("uint256"), [params.amount]);
  return {
    address: token,
    topics: topics as [`0x${string}`, ...`0x${string}`[]],
    data,
    blockHash: "0x" + "00".repeat(32),
    blockNumber: 1n,
    logIndex: params.logIndex,
    transactionHash: HASH as `0x${string}`,
    transactionIndex: 0,
    removed: false,
  };
}

function secondaryClaimLog(amount: bigint, logIndex: number) {
  const topics = encodeEventTopics({
    abi: ContestController.abi,
    eventName: "SecondaryPayoutClaimed",
    args: { participant: TO as `0x${string}`, entryId: 9n },
  });
  const data = encodeAbiParameters(parseAbiParameters("uint256"), [amount]);
  return {
    address: TO as `0x${string}`,
    topics: topics as [`0x${string}`, ...`0x${string}`[]],
    data,
    blockHash: "0x" + "00".repeat(32),
    blockNumber: 1n,
    logIndex,
    transactionHash: HASH as `0x${string}`,
    transactionIndex: 0,
    removed: false,
  };
}

function useReceipt(logs: TransactionReceipt["logs"]) {
  loadTransactionReceipt.mockResolvedValue({ ok: true, receipt: receiptWith(logs) });
}

describe("recordValueTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMany.mockResolvedValue({ count: 1 });
    update.mockResolvedValue({});
    findMany.mockResolvedValue([]);
    findFirst.mockResolvedValue(null);
    findUnique.mockResolvedValue({ address: TO, chainId: 84532 });
    readContestPaymentToken.mockResolvedValue({ ok: true, paymentToken: TOKEN });
    useReceipt([]);
  });

  it("inserts an entry deposit with the transfer log index", async () => {
    useReceipt([transferLog({ from: FROM, to: TO, amount: 1_000_000n, logIndex: 4 })]);
    await recordValueTransfer({
      userId: "user-1",
      walletAddress: FROM,
      chainId: 84532,
      kind: "ENTRY",
      tokenAddress: TOKEN,
      amountWei: "1000000",
      from: FROM,
      to: TO,
      contestId: "contest-1",
      entryId: "9",
      lineupId: "lineup-1",
      transactionHash: HASH,
      logIndex: 4,
    });

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          kind: "ENTRY",
          walletAddress: FROM,
          userId: "user-1",
          contestId: "contest-1",
          amountWei: "1000000",
          transactionHash: HASH,
          logIndex: 4,
          metadata: {
            direction: "out",
            counterparty: TO,
            entryId: "9",
            lineupId: "lineup-1",
          },
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("writes a recipient send only when that wallet belongs to a user", async () => {
    findFirst.mockResolvedValue({ userId: "user-2" });
    useReceipt([transferLog({ from: FROM, to: TO, amount: 5n, logIndex: 1 })]);

    await recordValueTransfer({
      userId: "user-1",
      walletAddress: FROM,
      chainId: 84532,
      kind: "SEND",
      tokenAddress: TOKEN,
      amountWei: "5",
      from: FROM,
      to: TO,
      transactionHash: HASH,
      logIndex: 1,
    });

    expect(createMany).toHaveBeenCalledTimes(2);
    expect(createMany).toHaveBeenLastCalledWith({
      data: [
        expect.objectContaining({
          kind: "SEND",
          walletAddress: TO,
          userId: "user-2",
          metadata: { direction: "in", counterparty: FROM },
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("does not write a recipient row for an unknown wallet", async () => {
    useReceipt([transferLog({ from: FROM, to: TO, amount: 5n, logIndex: 1 })]);
    await recordValueTransfer({
      userId: "user-1",
      walletAddress: FROM,
      chainId: 84532,
      kind: "SEND",
      tokenAddress: TOKEN,
      amountWei: "5",
      from: FROM,
      to: TO,
      transactionHash: HASH,
      logIndex: 1,
    });

    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it("stores the claim hash on an existing payout instead of inserting another amount", async () => {
    findMany.mockResolvedValue([
      { id: "pay-1", metadata: { entryId: "9", shareBps: 10000 } },
    ]);
    useReceipt([secondaryClaimLog(50n, 7)]);

    await recordValueTransfer({
      userId: "user-1",
      walletAddress: TO,
      chainId: 84532,
      kind: "SECONDARY",
      tokenAddress: TOKEN,
      amountWei: "50",
      from: FROM,
      to: TO,
      contestId: "contest-1",
      entryId: "9",
      transactionHash: HASH,
      logIndex: 2,
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: { metadata: { entryId: "9", shareBps: 10000, claimTx: HASH } },
    });
    expect(createMany).not.toHaveBeenCalled();
  });

  it("inserts the payout kind when the claim is the first time the credit is seen", async () => {
    useReceipt([secondaryClaimLog(50n, 7)]);
    await recordValueTransfer({
      userId: "user-1",
      walletAddress: TO,
      chainId: 84532,
      kind: "SECONDARY",
      tokenAddress: TOKEN,
      amountWei: "50",
      from: FROM,
      to: TO,
      contestId: "contest-1",
      entryId: "9",
      transactionHash: HASH,
      logIndex: 2,
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          kind: "SECONDARY",
          walletAddress: TO,
          logIndex: 7,
          metadata: expect.objectContaining({ claimTx: HASH, direction: "in", entryId: "9" }),
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("rejects a transfer from a wallet the account does not own", async () => {
    await expect(
      recordValueTransfer({
        userId: "user-1",
        walletAddress: TO,
        chainId: 84532,
        kind: "ENTRY",
        tokenAddress: TOKEN,
        amountWei: "1",
        from: FROM,
        to: TO,
        contestId: "contest-1",
        transactionHash: HASH,
        logIndex: 1,
      }),
    ).rejects.toBeInstanceOf(ValueTransferError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("rejects an entry whose amount does not match the transfer log", async () => {
    useReceipt([transferLog({ from: FROM, to: TO, amount: 1n, logIndex: 4 })]);
    await expect(
      recordValueTransfer({
        userId: "user-1",
        walletAddress: FROM,
        chainId: 84532,
        kind: "ENTRY",
        tokenAddress: TOKEN,
        amountWei: "1000000",
        from: FROM,
        to: TO,
        contestId: "contest-1",
        transactionHash: HASH,
        logIndex: 4,
      }),
    ).rejects.toBeInstanceOf(ValueTransferError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("rejects an entry transfer that is not from the account to the contest", async () => {
    useReceipt([transferLog({ from: FROM, to: OTHER, amount: 1_000_000n, logIndex: 4 })]);
    await expect(
      recordValueTransfer({
        userId: "user-1",
        walletAddress: FROM,
        chainId: 84532,
        kind: "ENTRY",
        tokenAddress: TOKEN,
        amountWei: "1000000",
        from: FROM,
        to: OTHER,
        contestId: "contest-1",
        transactionHash: HASH,
        logIndex: 4,
      }),
    ).rejects.toBeInstanceOf(ValueTransferError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("rejects a payout that has no claim event", async () => {
    useReceipt([transferLog({ from: TO, to: FROM, amount: 50n, logIndex: 2 })]);
    await expect(
      recordValueTransfer({
        userId: "user-1",
        walletAddress: TO,
        chainId: 84532,
        kind: "SECONDARY",
        tokenAddress: TOKEN,
        amountWei: "50",
        from: FROM,
        to: TO,
        contestId: "contest-1",
        entryId: "9",
        transactionHash: HASH,
        logIndex: 2,
      }),
    ).rejects.toBeInstanceOf(ValueTransferError);
    expect(createMany).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
