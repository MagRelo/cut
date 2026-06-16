import { SideBetMarketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  summarizeSideBetBatch,
  type SideBetBatchOperationResult,
} from "./sideBetBatchShared.js";

export type { SideBetBatchOperationSummary } from "./sideBetBatchShared.js";

const LOCKABLE_MARKET_STATUSES: SideBetMarketStatus[] = [
  SideBetMarketStatus.OPEN,
  SideBetMarketStatus.UNAVAILABLE,
];

export async function batchLockSideBetMarkets(params?: {
  eventId?: string;
}): Promise<ReturnType<typeof summarizeSideBetBatch>> {
  const eventId = params?.eventId?.trim();
  const where: {
    status: { in: SideBetMarketStatus[] };
    eventId?: string;
  } = { status: { in: LOCKABLE_MARKET_STATUSES } };
  if (eventId) where.eventId = eventId;

  const markets = await prisma.sideBetMarket.findMany({ where, select: { id: true } });
  const results: SideBetBatchOperationResult[] = [];

  for (const market of markets) {
    try {
      await prisma.sideBetMarket.update({
        where: { id: market.id },
        data: { status: SideBetMarketStatus.LOCKED, lockedAt: new Date() },
      });
      results.push({ success: true, marketId: market.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ success: false, marketId: market.id, error: msg });
    }
  }

  return summarizeSideBetBatch(results);
}
