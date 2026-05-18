import { SideBetMarketStatus, SideBetTicketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { settleOpenTicketIfPossible } from "../betting/settleSideBetTicket.js";
import {
  summarizeSideBetBatch,
  type SideBetBatchOperationResult,
} from "./sideBetBatchShared.js";

export type { SideBetBatchOperationSummary } from "./sideBetBatchShared.js";

/** Locked markets and UNAVAILABLE markets that may still hold open tickets from a prior OPEN window. */
const SETTLEABLE_MARKET_STATUSES: SideBetMarketStatus[] = [
  SideBetMarketStatus.LOCKED,
  SideBetMarketStatus.UNAVAILABLE,
];

export async function batchSettleSideBets(params?: {
  tournamentId?: string;
}): Promise<ReturnType<typeof summarizeSideBetBatch>> {
  const markets = await prisma.sideBetMarket.findMany({
    where: {
      status: { in: SETTLEABLE_MARKET_STATUSES },
      tournament: {
        is: {
          status: "COMPLETED",
          ...(params?.tournamentId ? { id: params.tournamentId } : {}),
        },
      },
    },
    select: { id: true },
  });

  const results: SideBetBatchOperationResult[] = [];

  for (const m of markets) {
    try {
      await prisma.$transaction(async (tx) => {
        const openTickets = await tx.sideBetTicket.findMany({
          where: { sideBetMarketId: m.id, status: SideBetTicketStatus.OPEN },
          select: { id: true },
        });
        for (const t of openTickets) {
          const r = await settleOpenTicketIfPossible(tx, t.id);
          if (!r.ok) throw new Error(r.reason);
        }
        await tx.sideBetMarket.update({
          where: { id: m.id },
          data: { status: SideBetMarketStatus.SETTLED, settledAt: new Date() },
        });
      });
      results.push({ success: true, marketId: m.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ success: false, marketId: m.id, error: msg });
    }
  }

  return summarizeSideBetBatch(results);
}
