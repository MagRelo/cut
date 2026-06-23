import { SideBetMarketStatus, SideBetTicketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { settleOpenTicketIfPossible } from "../betting/settleSideBetTicket.js";
import { isEventCompleteForSettlement } from "../admin/adminEventContext.js";
import {
  summarizeSideBetBatch,
  type SideBetBatchOperationResult,
} from "./sideBetBatchShared.js";

export type { SideBetBatchOperationSummary } from "./sideBetBatchShared.js";

const SETTLEABLE_MARKET_STATUSES: SideBetMarketStatus[] = [
  SideBetMarketStatus.LOCKED,
  SideBetMarketStatus.UNAVAILABLE,
];

export async function batchSettleSideBets(params?: {
  eventId?: string;
}): Promise<ReturnType<typeof summarizeSideBetBatch>> {
  const eventId = params?.eventId?.trim();

  const markets = await prisma.sideBetMarket.findMany({
    where: {
      status: { in: SETTLEABLE_MARKET_STATUSES },
      ...(eventId ? { eventId } : {}),
    },
    select: { id: true, event: { select: { metadata: true } } },
  });

  const results: SideBetBatchOperationResult[] = [];

  for (const market of markets) {
    if (!isEventCompleteForSettlement(market.event.metadata)) {
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const openTickets = await tx.sideBetTicket.findMany({
          where: { sideBetMarketId: market.id, status: SideBetTicketStatus.OPEN },
          select: { id: true },
        });
        for (const ticket of openTickets) {
          const result = await settleOpenTicketIfPossible(tx, ticket.id);
          if (!result.ok) throw new Error(result.reason);
        }
        await tx.sideBetMarket.update({
          where: { id: market.id },
          data: { status: SideBetMarketStatus.SETTLED, settledAt: new Date() },
        });
      });
      results.push({ success: true, marketId: market.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ success: false, marketId: market.id, error: msg });
    }
  }

  return summarizeSideBetBatch(results);
}
