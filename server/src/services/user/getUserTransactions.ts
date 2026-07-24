import { formatUnits } from "viem";
import { prisma } from "../../lib/prisma.js";
import { getPaymentTokenAddress } from "../../lib/contractAddresses.js";

export type UserTxnType =
  | "CONTEST_ENTRY"
  | "PREDICTION_BUY"
  | "SIDE_BET"
  | "SIDE_BET_PAYOUT"
  | "SIDE_BET_REFUND"
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

const PAYMENT_TOKEN_DECIMALS = 6;
const LEGACY_TOKEN_DECIMALS = 18;

function paymentDecimals(chainId: number, tokenAddress: string | null | undefined): number {
  if (!tokenAddress) return PAYMENT_TOKEN_DECIMALS;
  const configured = getPaymentTokenAddress(chainId);
  if (configured && configured.toLowerCase() === tokenAddress.toLowerCase()) {
    return PAYMENT_TOKEN_DECIMALS;
  }
  return LEGACY_TOKEN_DECIMALS;
}

function humanFromWei(
  amountWei: string | null | undefined,
  chainId: number,
  tokenAddress?: string | null,
): number | null {
  if (amountWei == null || amountWei === "") return null;
  try {
    const decimals = paymentDecimals(chainId, tokenAddress);
    return Number(formatUnits(BigInt(amountWei), decimals));
  } catch {
    return null;
  }
}

function eventDisplayName(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const name = (metadata as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return null;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getUserTransactions(userId: string): Promise<UserTransaction[]> {
  const [lineups, predictions, tickets, payments] = await Promise.all([
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
    prisma.sideBetTicket.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        stakeAmount: true,
        decimalOddsAtPlacement: true,
        americanDisplayAtPlacement: true,
        status: true,
        fundingTxHash: true,
        hitsRequired: true,
        topN: true,
        sideBetMarket: {
          select: {
            dgEventName: true,
            event: {
              select: {
                metadata: true,
              },
            },
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
      contestAddress: lineup.contest.address,
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
      contestAddress: pred.contest.address,
      chainId: pred.chainId,
      txHash: pred.lastTransactionHash,
    });
  }

  for (const ticket of tickets) {
    const eventName =
      ticket.sideBetMarket.dgEventName ??
      eventDisplayName(ticket.sideBetMarket.event.metadata) ??
      "Side bet";
    const oddsDetail = `${ticket.hitsRequired}/${ticket.topN} · ${ticket.americanDisplayAtPlacement}`;

    rows.push({
      id: `SIDE_BET:${ticket.id}`,
      type: "SIDE_BET",
      createdAt: ticket.createdAt.toISOString(),
      amount: -roundMoney(ticket.stakeAmount),
      currency: "USD",
      label: eventName,
      detail: `Side bet · ${oddsDetail} · ${ticket.status}`,
      txHash: ticket.fundingTxHash,
    });

    if (ticket.status === "WON") {
      const payout = roundMoney(ticket.stakeAmount * ticket.decimalOddsAtPlacement);
      rows.push({
        id: `SIDE_BET_PAYOUT:${ticket.id}`,
        type: "SIDE_BET_PAYOUT",
        createdAt: ticket.updatedAt.toISOString(),
        amount: payout,
        currency: "USD",
        label: eventName,
        detail: `Side bet payout · ${oddsDetail}`,
      });
    } else if (ticket.status === "VOID" || ticket.status === "REFUND_PENDING") {
      rows.push({
        id: `SIDE_BET_REFUND:${ticket.id}`,
        type: "SIDE_BET_REFUND",
        createdAt: ticket.updatedAt.toISOString(),
        amount: roundMoney(ticket.stakeAmount),
        currency: "USD",
        label: eventName,
        detail: `Side bet refund · ${ticket.status}`,
        txHash: ticket.fundingTxHash,
      });
    }
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
