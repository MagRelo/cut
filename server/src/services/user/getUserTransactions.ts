import { prisma } from "../../lib/prisma.js";
import { humanFromWei, roundMoney } from "../../utils/paymentAmount.js";

export type UserTxnType =
  | "CONTEST_ENTRY"
  | "PREDICTION_BUY"
  | "PAYOUT_PRIMARY"
  | "PAYOUT_SECONDARY"
  | "PAYOUT_REFERRAL";

export type UserTransaction = {
  id: string;
  type: UserTxnType;
  createdAt: string;
  amount: number | null;
  currency: "USD";
  label: string;
  detail: string | null;
  contestId?: string;
  contestAddress?: string;
  chainId?: number;
  txHash?: string | null;
};

export async function getUserTransactions(userId: string): Promise<UserTransaction[]> {
  const [lineups, predictions, payments] = await Promise.all([
    prisma.contestLineup.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        contestId: true,
        contest: {
          select: {
            id: true,
            address: true,
            name: true,
            chainId: true,
            settings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contestSecondaryParticipant.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        entryId: true,
        amountWei: true,
        lastTransactionHash: true,
        chainId: true,
        contestId: true,
        contest: {
          select: {
            id: true,
            address: true,
            name: true,
            chainId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.onchainPayment.findMany({
      where: { userId },
      select: {
        id: true,
        kind: true,
        amountWei: true,
        transactionHash: true,
        tokenAddress: true,
        chainId: true,
        createdAt: true,
        contestId: true,
        contest: {
          select: {
            id: true,
            address: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows: UserTransaction[] = [];

  for (const lineup of lineups) {
    const settings = lineup.contest.settings as { primaryDeposit?: number } | null;
    const primaryDeposit = settings?.primaryDeposit;
    const amount =
      primaryDeposit == null ? null : primaryDeposit === 0 ? 0 : -roundMoney(primaryDeposit);
    rows.push({
      id: `CONTEST_ENTRY:${lineup.id}`,
      type: "CONTEST_ENTRY",
      createdAt: lineup.createdAt.toISOString(),
      amount,
      currency: "USD",
      label: lineup.contest.name,
      detail: "Contest entry",
      contestId: lineup.contest.id,
      ...(lineup.contest.address ? { contestAddress: lineup.contest.address } : {}),
      chainId: lineup.contest.chainId,
    });
  }

  for (const pred of predictions) {
    const human = humanFromWei(pred.amountWei, pred.chainId);
    rows.push({
      id: `PREDICTION_BUY:${pred.id}`,
      type: "PREDICTION_BUY",
      createdAt: pred.createdAt.toISOString(),
      amount: human == null ? null : -roundMoney(human),
      currency: "USD",
      label: pred.contest.name,
      detail: `Winner pool ticket · entry ${pred.entryId}`,
      contestId: pred.contest.id,
      ...(pred.contest.address ? { contestAddress: pred.contest.address } : {}),
      chainId: pred.chainId,
      txHash: pred.lastTransactionHash,
    });
  }

  for (const payment of payments) {
    const type: UserTxnType =
      payment.kind === "PRIMARY"
        ? "PAYOUT_PRIMARY"
        : payment.kind === "SECONDARY"
          ? "PAYOUT_SECONDARY"
          : "PAYOUT_REFERRAL";
    const human = humanFromWei(payment.amountWei, payment.chainId, payment.tokenAddress);
    const kindLabel =
      payment.kind === "PRIMARY"
        ? "Contest payout"
        : payment.kind === "SECONDARY"
          ? "Winner pool payout"
          : "Referral payout";
    rows.push({
      id: `${type}:${payment.id}`,
      type,
      createdAt: payment.createdAt.toISOString(),
      amount: human == null ? null : roundMoney(human),
      currency: "USD",
      label: payment.contest?.name ?? kindLabel,
      detail: kindLabel,
      ...(payment.contest?.id ? { contestId: payment.contest.id } : {}),
      ...(payment.contest?.address ? { contestAddress: payment.contest.address } : {}),
      chainId: payment.chainId,
      txHash: payment.transactionHash,
    });
  }

  rows.sort((a, b) => {
    const t = b.createdAt.localeCompare(a.createdAt);
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });

  return rows;
}
