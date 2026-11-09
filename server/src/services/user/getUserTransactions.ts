import { prisma } from "../../lib/prisma.js";
import { humanFromWei, roundMoney } from "../../utils/paymentAmount.js";

export type UserTxnType =
  | "CONTEST_ENTRY"
  | "PREDICTION_BUY"
  | "PAYOUT_PRIMARY"
  | "PAYOUT_SECONDARY"
  | "PAYOUT_REFERRAL"
  | "SEND"
  | "WITHDRAW"
  | "REFUND";

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

type ActivityLineup = {
  id: string;
  createdAt: Date;
  contestId: string;
  contest: {
    id: string;
    address: string | null;
    name: string;
    chainId: number;
    settings: unknown;
  };
};

type ActivityPrediction = {
  id: string;
  createdAt: Date;
  entryId: string;
  amountWei: string | null;
  lastTransactionHash: string | null;
  chainId: number;
  contestId: string;
  contest: { id: string; address: string | null; name: string; chainId: number };
};

type ActivityPayment = {
  id: string;
  kind: string;
  amountWei: string;
  transactionHash: string;
  tokenAddress: string;
  chainId: number;
  createdAt: Date;
  contestId: string | null;
  metadata: unknown;
  contest: { id: string; address: string | null; name: string } | null;
};

function readMeta(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function signedAmount(kind: string, meta: Record<string, unknown>, human: number | null): number | null {
  if (human == null) return null;
  const magnitude = roundMoney(human);
  if (kind === "ENTRY" || kind === "WAGER" || (kind === "SEND" && meta.direction !== "in")) {
    return -magnitude;
  }
  return magnitude;
}

export function assembleUserTransactions(
  lineups: ActivityLineup[],
  predictions: ActivityPrediction[],
  payments: ActivityPayment[],
): UserTransaction[] {
  const entryLineupIds = new Set<string>();
  const wagerKeys = new Set<string>();
  for (const payment of payments) {
    const meta = readMeta(payment.metadata);
    if (payment.kind === "ENTRY" && typeof meta.lineupId === "string") {
      entryLineupIds.add(meta.lineupId);
    }
    if (payment.kind === "WAGER" && payment.contestId && typeof meta.entryId === "string") {
      wagerKeys.add(`${payment.contestId}:${meta.entryId}`);
    }
  }

  const rows: UserTransaction[] = [];

  for (const lineup of lineups) {
    if (entryLineupIds.has(lineup.id)) continue;
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
    if (wagerKeys.has(`${pred.contestId}:${pred.entryId}`)) continue;
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
    const meta = readMeta(payment.metadata);
    const human = humanFromWei(payment.amountWei, payment.chainId, payment.tokenAddress);
    const contestBits = {
      ...(payment.contest?.id ? { contestId: payment.contest.id } : {}),
      ...(payment.contest?.address ? { contestAddress: payment.contest.address } : {}),
      chainId: payment.chainId,
      txHash: payment.transactionHash,
    };

    if (payment.kind === "PRIMARY" || payment.kind === "SECONDARY" || payment.kind === "REFERRAL") {
      const type: UserTxnType =
        payment.kind === "PRIMARY"
          ? "PAYOUT_PRIMARY"
          : payment.kind === "SECONDARY"
            ? "PAYOUT_SECONDARY"
            : "PAYOUT_REFERRAL";
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
        ...contestBits,
      });
      continue;
    }

    if (payment.kind === "ENTRY") {
      rows.push({
        id: `CONTEST_ENTRY:${payment.id}`,
        type: "CONTEST_ENTRY",
        createdAt: payment.createdAt.toISOString(),
        amount: signedAmount(payment.kind, meta, human),
        currency: "USD",
        label: payment.contest?.name ?? "Contest entry",
        detail: "Contest entry",
        ...contestBits,
      });
      continue;
    }

    if (payment.kind === "WAGER") {
      const entryId = typeof meta.entryId === "string" ? meta.entryId : null;
      rows.push({
        id: `PREDICTION_BUY:${payment.id}`,
        type: "PREDICTION_BUY",
        createdAt: payment.createdAt.toISOString(),
        amount: signedAmount(payment.kind, meta, human),
        currency: "USD",
        label: payment.contest?.name ?? "Winner pool ticket",
        detail: entryId ? `Winner pool ticket · entry ${entryId}` : "Winner pool ticket",
        ...contestBits,
      });
      continue;
    }

    if (payment.kind === "SEND" || payment.kind === "WITHDRAW" || payment.kind === "REFUND") {
      const counterparty = typeof meta.counterparty === "string" ? meta.counterparty : null;
      const incoming = payment.kind === "SEND" && meta.direction === "in";
      const detail =
        payment.kind === "SEND"
          ? counterparty
            ? `${incoming ? "From" : "To"} ${counterparty}`
            : incoming
              ? "Received"
              : "Sent"
          : payment.kind === "WITHDRAW"
            ? "Winner pool withdrawal"
            : "Contest refund";
      rows.push({
        id: `${payment.kind}:${payment.id}`,
        type: payment.kind,
        createdAt: payment.createdAt.toISOString(),
        amount: signedAmount(payment.kind, meta, human),
        currency: "USD",
        label:
          payment.contest?.name ??
          (payment.kind === "SEND" ? (incoming ? "Received" : "Sent") : detail),
        detail,
        ...contestBits,
      });
    }
  }

  rows.sort((a, b) => {
    const t = b.createdAt.localeCompare(a.createdAt);
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });

  return rows;
}

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
        metadata: true,
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

  return assembleUserTransactions(lineups, predictions, payments);
}
