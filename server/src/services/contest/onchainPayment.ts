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
  logIndex: number | null;
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
  await prisma.onchainPayment.create({ data });
}
