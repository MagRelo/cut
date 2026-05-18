import { SideBetMarketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  summarizeSideBetBatch,
  type SideBetBatchOperationResult,
} from "./sideBetBatchShared.js";

export type { SideBetBatchOperationSummary } from "./sideBetBatchShared.js";

/** Markets that accept new tickets (OPEN) or are paused but still have placements (UNAVAILABLE). */
const LOCKABLE_MARKET_STATUSES: SideBetMarketStatus[] = [
  SideBetMarketStatus.OPEN,
  SideBetMarketStatus.UNAVAILABLE,
];

export async function batchLockSideBetMarkets(params?: {
  tournamentId?: string;
}): Promise<ReturnType<typeof summarizeSideBetBatch>> {
  const where: {
    status: { in: SideBetMarketStatus[] };
    tournamentId?: string;
  } = { status: { in: LOCKABLE_MARKET_STATUSES } };
  if (params?.tournamentId) where.tournamentId = params.tournamentId;

  const markets = await prisma.sideBetMarket.findMany({ where, select: { id: true } });
  const results: SideBetBatchOperationResult[] = [];

  for (const m of markets) {
    try {
      await prisma.sideBetMarket.update({
        where: { id: m.id },
        data: { status: SideBetMarketStatus.LOCKED, lockedAt: new Date() },
      });
      results.push({ success: true, marketId: m.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ success: false, marketId: m.id, error: msg });
    }
  }

  return summarizeSideBetBatch(results);
}
