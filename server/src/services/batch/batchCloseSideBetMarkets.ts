import { SideBetMarketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  summarizeSideBetBatch,
  type SideBetBatchOperationResult,
} from "./sideBetBatchShared.js";

export type { SideBetBatchOperationSummary } from "./sideBetBatchShared.js";

export async function batchCloseSideBetMarkets(params?: {
  tournamentId?: string;
}): Promise<ReturnType<typeof summarizeSideBetBatch>> {
  const where: {
    status: typeof SideBetMarketStatus.SETTLED;
    tournamentId?: string;
  } = { status: SideBetMarketStatus.SETTLED };
  if (params?.tournamentId) where.tournamentId = params.tournamentId;

  const markets = await prisma.sideBetMarket.findMany({ where, select: { id: true } });
  const results: SideBetBatchOperationResult[] = [];

  for (const m of markets) {
    try {
      await prisma.sideBetMarket.update({
        where: { id: m.id },
        data: { status: SideBetMarketStatus.CLOSED, closedAt: new Date() },
      });
      results.push({ success: true, marketId: m.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ success: false, marketId: m.id, error: msg });
    }
  }

  return summarizeSideBetBatch(results);
}
