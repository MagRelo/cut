import { Prisma } from "@prisma/client";
import type { CommodityParticipantMetadata, CommodityQuoteSnapshot } from "@cut/sport-commodities";
import { COMMODITIES_SPORT_ID, parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import { prisma } from "../../lib/prisma.js";
import {
  COMMODITY_CATALOG,
  commodityExternalId,
} from "./commodityCatalog.js";
import { fixtureQuote, type FixtureQuote } from "./fixtureMarketData.js";

function parseParticipantMetadata(metadata: unknown): CommodityParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as CommodityParticipantMetadata;
}

export function fixtureQuoteToSnapshot(quote: FixtureQuote): CommodityQuoteSnapshot {
  return {
    lastPrice: quote.regularMarketPrice,
    open: quote.regularMarketOpen,
    previousClose: quote.regularMarketPreviousClose,
    dayHigh: quote.regularMarketDayHigh,
    dayLow: quote.regularMarketDayLow,
    bid: null,
    ask: null,
    volume: quote.regularMarketVolume,
    changePercent: quote.regularMarketChangePercent,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
    marketState: quote.marketState,
    syncedAt: new Date().toISOString(),
  };
}

/** Refresh fixture quote snapshots on participant metadata (init + cron). */
export async function syncCommoditiesQuotes(eventId: string): Promise<void> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
    select: { metadata: true },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  const commodities = parseCommoditiesEventMetadata(event.metadata);
  const sessionDate = commodities?.sessionDate ?? new Date().toISOString().slice(0, 10);

  const participants = await prisma.participant.findMany({
    where: { sportId: COMMODITIES_SPORT_ID },
    select: { id: true, externalId: true, metadata: true },
  });
  const participantByExternalId = new Map(
    participants.map((row) => [row.externalId, row]),
  );

  let updated = 0;
  for (const entry of COMMODITY_CATALOG) {
    const quote = fixtureQuote(entry.symbol, sessionDate);
    const externalId = commodityExternalId(entry.symbol);
    const row = participantByExternalId.get(externalId);
    if (!row) {
      continue;
    }

    const existingMeta = parseParticipantMetadata(row.metadata);
    await prisma.participant.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...existingMeta,
          quote: fixtureQuoteToSnapshot(quote),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    updated += 1;
  }

  console.log(
    `[commodities] Synced fixture quotes for ${updated}/${COMMODITY_CATALOG.length} symbols (event ${eventId})`,
  );
}
