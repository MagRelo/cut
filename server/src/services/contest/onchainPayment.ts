import { Prisma } from "@prisma/client";
import { getAddress, isAddress, type Address } from "viem";
import { prisma } from "../../lib/prisma.js";
import { getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import type { PaymentKind } from "@prisma/client";
import {
  erc20TransferAt,
  loadTransactionReceipt,
  payoutClaimFromReceipt,
  readContestPaymentToken,
  type ReceiptLoadError,
} from "./verifyValueTransferReceipt.js";

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
    readonly status: 400 | 403 | 502 = 400,
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

const TRANSFER_KINDS = new Set<PaymentKind>(["ENTRY", "WAGER", "WITHDRAW", "REFUND", "SEND"]);

function receiptError(error: ReceiptLoadError): ValueTransferError {
  if (error === "rpc_error") return new ValueTransferError("Failed to verify payment", 502);
  if (error === "receipt_failed") return new ValueTransferError("Transaction did not succeed");
  return new ValueTransferError("Transaction receipt not found");
}

function checksum(address: string): Address {
  if (!isAddress(address)) throw new ValueTransferError("Payment does not match the transaction receipt");
  return getAddress(address);
}

async function loadVerifiedReceipt(chainId: number, transactionHash: string) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
    throw new ValueTransferError("Transaction receipt not found");
  }
  const loaded = await loadTransactionReceipt({
    chainId,
    transactionHash: transactionHash as `0x${string}`,
  });
  if (!loaded.ok) throw receiptError(loaded.error);
  return loaded.receipt;
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

  const receipt = await loadVerifiedReceipt(input.chainId, input.transactionHash);
  const wallet = checksum(input.walletAddress);
  const recorded = await verifiedMovement(input, receipt, wallet);

  if (PAYOUT_KINDS.has(input.kind)) {
    if (!input.contestId) {
      throw new ValueTransferError("contestId is required");
    }
    const existing = await prisma.onchainPayment.findMany({
      where: { userId: input.userId, contestId: input.contestId, kind: input.kind },
    });
    const match = existing.find((row) => {
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
    counterparty: (outgoing ? recorded.to : recorded.from).toLowerCase(),
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
    tokenAddress: recorded.tokenAddress,
    amountWei: recorded.amountWei,
    transactionHash: input.transactionHash,
    logIndex: recorded.logIndex,
    metadata,
  });

  if (input.kind !== "SEND" || sameAddress(recorded.from, recorded.to)) return;

  const recipientId = await resolveUserIdForWallet(input.chainId, recorded.to);
  if (!recipientId || recipientId === input.userId) return;

  await insertOnchainPaymentRow({
    kind: "SEND",
    walletAddress: recorded.to,
    userId: recipientId,
    contestId: null,
    chainId: input.chainId,
    tokenAddress: recorded.tokenAddress,
    amountWei: recorded.amountWei,
    transactionHash: input.transactionHash,
    logIndex: recorded.logIndex,
    metadata: {
      direction: "in",
      counterparty: recorded.from.toLowerCase(),
    },
  });
}

type VerifiedMovement = {
  tokenAddress: Address;
  from: Address;
  to: Address;
  amountWei: string;
  logIndex: number;
};

async function verifiedMovement(
  input: {
    kind: PaymentKind;
    tokenAddress: string;
    amountWei: string;
    from: string;
    to: string;
    contestId?: string;
    entryId?: string;
    chainId: number;
    logIndex: number;
  },
  receipt: Awaited<ReturnType<typeof loadVerifiedReceipt>>,
  wallet: Address,
): Promise<VerifiedMovement> {
  if (PAYOUT_KINDS.has(input.kind)) {
    if (input.kind !== "PRIMARY" && input.kind !== "SECONDARY") {
      throw new ValueTransferError("Payment does not match the transaction receipt");
    }
    if (!input.entryId) throw new ValueTransferError("entryId is required");
    const contest = await contestOnChain(input.contestId, input.chainId);
    const token = await contestToken(input.chainId, contest);
    if (checksum(input.tokenAddress) !== token) {
      throw new ValueTransferError("Payment does not match the transaction receipt");
    }
    const claim = payoutClaimFromReceipt({
      receipt,
      kind: input.kind,
      contestAddress: contest,
      walletAddress: wallet,
      entryId: input.entryId,
      amountWei: input.amountWei,
    });
    if (!claim) throw new ValueTransferError("Payment does not match the transaction receipt");
    return {
      tokenAddress: token,
      from: contest,
      to: wallet,
      amountWei: claim.amountWei,
      logIndex: claim.logIndex,
    };
  }

  if (!TRANSFER_KINDS.has(input.kind)) {
    throw new ValueTransferError("Payment does not match the transaction receipt");
  }
  const transfer = erc20TransferAt(receipt, input.logIndex);
  if (!transfer) throw new ValueTransferError("Payment does not match the transaction receipt");

  const from = checksum(input.from);
  const to = checksum(input.to);
  const token = checksum(input.tokenAddress);
  if (
    transfer.from !== from ||
    transfer.to !== to ||
    transfer.tokenAddress !== token ||
    transfer.amountWei !== input.amountWei
  ) {
    throw new ValueTransferError("Payment does not match the transaction receipt");
  }

  if (input.kind === "SEND") {
    const platform = getPaymentTokenAddress(input.chainId);
    if (!platform) throw new ValueTransferError("Payment token is not configured");
    if (transfer.from !== wallet || transfer.tokenAddress !== platform) {
      throw new ValueTransferError("Payment does not match the transaction receipt");
    }
    return { ...transfer, logIndex: input.logIndex };
  }

  const contest = await contestOnChain(input.contestId, input.chainId);
  const contestTokenAddress = await contestToken(input.chainId, contest);
  const paidByAccount = input.kind === "ENTRY" || input.kind === "WAGER";
  const expectedFrom = paidByAccount ? wallet : contest;
  const expectedTo = paidByAccount ? contest : wallet;
  if (
    transfer.from !== expectedFrom ||
    transfer.to !== expectedTo ||
    transfer.tokenAddress !== contestTokenAddress
  ) {
    throw new ValueTransferError("Payment does not match the transaction receipt");
  }
  return { ...transfer, logIndex: input.logIndex };
}

async function contestOnChain(contestId: string | undefined, chainId: number): Promise<Address> {
  if (!contestId) throw new ValueTransferError("contestId is required");
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { address: true, chainId: true },
  });
  if (!contest?.address || !isAddress(contest.address)) {
    throw new ValueTransferError("Contest not found");
  }
  if (contest.chainId !== chainId) {
    throw new ValueTransferError("Contest is on a different chain");
  }
  return getAddress(contest.address);
}

async function contestToken(chainId: number, contest: Address): Promise<Address> {
  const token = await readContestPaymentToken(chainId, contest);
  if (!token.ok) throw receiptError(token.error);
  return token.paymentToken;
}
