/**
 * Debug candidate quote + sparkline data for active commodities event.
 * Usage: pnpm --filter server run script:commodities-inspect-candidates
 */

import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { COMMODITIES_SPORT_ID, getEventFieldSnapshot } from "@cut/sport-commodities";
import type { CommodityParticipantMetadata } from "@cut/sport-commodities";
import { fetchAssetContexts, fetchCandles } from "../sports/commodities/hyperliquidClient.js";

async function main(): Promise<void> {
  const event = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, isActive: true },
  });
  if (!event) {
    throw new Error("No active commodities event");
  }

  const field = getEventFieldSnapshot(event.metadata);
  console.log(`Event ${event.externalId} (${event.id})`);
  console.log(`COMMODITIES_USE_FIXTURE_PRICES=${process.env.COMMODITIES_USE_FIXTURE_PRICES ?? "(unset)"}\n`);

  for (const entry of field) {
    const row = await prisma.participant.findFirst({
      where: { sportId: COMMODITIES_SPORT_ID, externalId: entry.ticker },
      select: { metadata: true },
    });
    const meta = (row?.metadata ?? {}) as CommodityParticipantMetadata;
    const hist = meta.priceHistory ?? [];
    console.log(`--- ${entry.ticker} (${entry.hlCoin}) ---`);
    console.log("  quote:", meta.quote);
    console.log(`  priceHistory: len=${hist.length}`, hist.length >= 2 ? `range ${Math.min(...hist)}–${Math.max(...hist)}` : "(blank sparkline)");
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
    const start = end - 30 * 4 * 3600 * 1000;
    const candles = await fetchCandles(coin, "4h", start, end);
    console.log(`  candles(4h): ${candles.length}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
