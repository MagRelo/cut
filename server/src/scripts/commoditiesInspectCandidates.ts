/**
 * Debug candidate quote + sparkline data for active commodities event.
 * Usage: pnpm --filter server run script:commodities-inspect-candidates
 */

import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import {
  CANDIDATE_PRICE_HISTORY_WEEKS,
  COMMODITIES_SPORT_ID,
  getEventFieldSnapshot,
  type CommodityParticipantMetadata,
  type CommodityPriceHistoryPoint,
} from "@cut/sport-commodities";
import { fetchAssetContexts, fetchCandles } from "../sports/commodities/hyperliquidClient.js";

function historySummary(history: CommodityPriceHistoryPoint[] | number[] | undefined): string {
  const hist = history ?? [];
  if (hist.length < 2) {
    return `len=${hist.length} (blank sparkline)`;
  }
  const values = hist.map((point) => (typeof point === "number" ? point : point.c));
  return `len=${hist.length} range ${Math.min(...values)}–${Math.max(...values)}`;
}

async function main(): Promise<void> {
  const event = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, isActive: true },
  });
  if (!event) {
    throw new Error("No active commodities event");
  }

  const field = getEventFieldSnapshot(event.metadata);
  console.log(`Event ${event.externalId} (${event.id})`);
  console.log(`COMMODITIES_USE_FIXTURE_PRICES=${process.env.COMMODITIES_USE_FIXTURE_PRICES ?? "(unset)"}`);
  console.log(`Candidate sparkline lookback: ${CANDIDATE_PRICE_HISTORY_WEEKS} weeks\n`);

  for (const entry of field) {
    const row = await prisma.participant.findFirst({
      where: { sportId: COMMODITIES_SPORT_ID, externalId: entry.ticker },
      select: { metadata: true },
    });
    const meta = (row?.metadata ?? {}) as CommodityParticipantMetadata;
    console.log(`--- ${entry.ticker} (${entry.hlCoin}) ---`);
    console.log("  quote:", meta.quote);
    console.log(`  priceHistory (picker): ${historySummary(meta.priceHistory)}`);
    console.log(`  sessionPriceHistory (live): ${historySummary(meta.sessionPriceHistory)}`);
  }

  for (const coin of ["xyz:CL", "xyz:TTF", "xyz:BRENTOIL"]) {
    const dex = coin.split(":")[0]!;
    const assets = await fetchAssetContexts(dex);
    const asset = assets.find((a) => a.hlCoin === coin);
    console.log(`\nHL ${coin}:`, asset
      ? {
          mark: asset.context.markPx,
          prev: asset.context.prevDayPx,
          impact: asset.context.impactPxs,
          dayVlm: asset.context.dayNtlVlm,
        }
      : "NOT FOUND");

    const end = Date.now();
    const start = end - 14 * 24 * 3600 * 1000;
    const candles = await fetchCandles(coin, "4h", start, end);
    console.log(`  candles(4h, 2w): ${candles.length}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
