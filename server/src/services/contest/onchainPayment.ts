import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { PaymentKind } from "@prisma/client";

export async function resolveUserIdForWallet(
  chainId: number,
  walletAddress: string,
): Promise<string | null> {
  const row = await prisma.userWallet.findFirst({
    where: {
      chainId,
      publicKey: { equals: walletAddress, mode: "insensitive" },
    },
    select: { userId: true },
  });
  return row?.userId ?? null;
}

export async function insertOnchainPaymentRow(input: {
  kind: PaymentKind;
  walletAddress: string;
  userId: string | null;
  contestId: string | null;
  chainId: number;
  tokenAddress: string;
  amountWei: string;
  transactionHash: string;
  logIndex: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const data: Prisma.OnchainPaymentUncheckedCreateInput = {
    kind: input.kind,
    walletAddress: input.walletAddress.toLowerCase(),
    userId: input.userId,
    contestId: input.contestId,
    chainId: input.chainId,
    tokenAddress: input.tokenAddress.toLowerCase(),
    amountWei: input.amountWei,
    transactionHash: input.transactionHash,
    logIndex: input.logIndex,
  };
  if (input.metadata !== undefined) {
    data.metadata = input.metadata as Prisma.InputJsonValue;
  }
  await prisma.onchainPayment.createMany({
    data: [data],
    skipDuplicates: true,
  });
}

const PAYOUT_KINDS = new Set<PaymentKind>(["PRIMARY", "SECONDARY"]);
const OUTGOING_KINDS = new Set<PaymentKind>(["ENTRY", "WAGER", "SEND"]);

export class ValueTransferError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 = 400,
  ) {
    super(message);
    this.name = "ValueTransferError";
  }
}

function asMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export async function recordValueTransfer(input: {
  userId: string;
  walletAddress: string;
  chainId: number;
  kind: PaymentKind;
  tokenAddress: string;
  amountWei: string;
  from: string;
  to: string;
  contestId?: string;
  entryId?: string;
  lineupId?: string;
  transactionHash: string;
  logIndex: number;
}): Promise<void> {
  const owns = async (address: string) => {
    if (input.walletAddress && sameAddress(address, input.walletAddress)) return true;
    const owner = await resolveUserIdForWallet(input.chainId, address);
    return owner === input.userId;
  };

  const outgoing = OUTGOING_KINDS.has(input.kind);
  const actor = outgoing ? input.from : input.to;
  if (!(await owns(actor))) {
    throw new ValueTransferError("Wallet does not belong to this account", 403);
  }

  if (PAYOUT_KINDS.has(input.kind)) {
    if (!input.contestId) {
      throw new ValueTransferError("contestId is required");
    }
    const existing = await prisma.onchainPayment.findMany({
      where: { userId: input.userId, contestId: input.contestId, kind: input.kind },
    });
    const match = existing.find((row) => {
      if (!input.entryId) return true;
      const meta = asMetadata(row.metadata);
      return meta.entryId == null || String(meta.entryId) === input.entryId;
    });
    if (match) {
      await prisma.onchainPayment.update({
        where: { id: match.id },
        data: {
          metadata: {
            ...asMetadata(match.metadata),
            claimTx: input.transactionHash,
            ...(input.entryId ? { entryId: input.entryId } : {}),
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }
  }

  const metadata: Record<string, unknown> = {
    direction: outgoing ? "out" : "in",
    counterparty: (outgoing ? input.to : input.from).toLowerCase(),
  };
  if (input.entryId) metadata.entryId = input.entryId;
  if (input.lineupId) metadata.lineupId = input.lineupId;
  if (PAYOUT_KINDS.has(input.kind)) metadata.claimTx = input.transactionHash;

  await insertOnchainPaymentRow({
    kind: input.kind,
    walletAddress: actor,
    userId: input.userId,
    contestId: input.contestId ?? null,
    chainId: input.chainId,
    tokenAddress: input.tokenAddress,
    amountWei: input.amountWei,
    transactionHash: input.transactionHash,
    logIndex: input.logIndex,
    metadata,
  });

  if (input.kind !== "SEND" || sameAddress(input.from, input.to)) return;

  const recipientId = await resolveUserIdForWallet(input.chainId, input.to);
  if (!recipientId || recipientId === input.userId) return;

  await insertOnchainPaymentRow({
    kind: "SEND",
    walletAddress: input.to,
    userId: recipientId,
    contestId: null,
    chainId: input.chainId,
    tokenAddress: input.tokenAddress,
    amountWei: input.amountWei,
    transactionHash: input.transactionHash,
    logIndex: input.logIndex,
    metadata: {
      direction: "in",
      counterparty: input.from.toLowerCase(),
    },
  });
}
