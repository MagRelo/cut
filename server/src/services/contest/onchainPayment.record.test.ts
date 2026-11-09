import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMany, findMany, update, findFirst } = vi.hoisted(() => ({
  createMany: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    onchainPayment: { createMany, findMany, update },
    userWallet: { findFirst },
  },
}));

import { recordValueTransfer, ValueTransferError } from "./onchainPayment.js";

const FROM = "0x1111111111111111111111111111111111111111";
const TO = "0x2222222222222222222222222222222222222222";
const TOKEN = "0x3333333333333333333333333333333333333333";
const HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("recordValueTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMany.mockResolvedValue({ count: 1 });
    update.mockResolvedValue({});
    findMany.mockResolvedValue([]);
    findFirst.mockResolvedValue(null);
  });

  it("inserts an entry deposit with the transfer log index", async () => {
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
});
