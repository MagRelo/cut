import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  commoditiesEventStatusFromMetadata,
  COMMODITIES_SPORT_ID,
  commoditiesShouldSyncLiveScores,
  transformCommodityPrice,
} from "@cut/sport-commodities";
import {
  COMMODITY_CATALOG,
  findCatalogEntryByExternalId,
} from "./commodityCatalog.js";
import {
  fetchYahooDailyBars,
  fetchYahooQuotes,
} from "./yahooFinanceClient.js";
import { mergeCommoditiesEventMetadata, requireCommoditiesMetadata } from "./metadataMerge.js";

export async function syncCommoditiesLiveScores(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  if (!commoditiesShouldSyncLiveScores(event.metadata)) {
    console.log(`[commodities] Skipping live score sync for ${eventId} (event not live)`);
    return;
  }

  const commoditiesMeta = requireCommoditiesMetadata(event.metadata);
  const eventStatus = commoditiesEventStatusFromMetadata(event.metadata);
  const isComplete = eventStatus === "COMPLETE";

  const symbols = COMMODITY_CATALOG.map((entry) => entry.yahooSymbol);
  const [dailyBars, quotes] = await Promise.all([
    fetchYahooDailyBars(symbols, commoditiesMeta.sessionDate),
    fetchYahooQuotes(symbols),
  ]);
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));

  const eventParticipants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  });

  let updatedCount = 0;

  for (const eventParticipant of eventParticipants) {
    const catalogEntry = findCatalogEntryByExternalId(eventParticipant.participant.externalId ?? "");
    if (!catalogEntry) {
      continue;
    }

    const bar = dailyBars.get(catalogEntry.yahooSymbol);
    const quote = quoteBySymbol.get(catalogEntry.yahooSymbol);

    const openPrice =
      bar?.open ??
      quote?.regularMarketOpen ??
      quote?.regularMarketPreviousClose ??
      null;

    const currentPrice = quote?.regularMarketPrice ?? bar?.close ?? null;
    const closePrice = isComplete ? (bar?.close ?? quote?.regularMarketPrice ?? null) : null;

    const payload = transformCommodityPrice({
      openPrice,
      currentPrice,
      closePrice,
      provisional: !isComplete,
    });

    await prisma.eventParticipant.update({
      where: { id: eventParticipant.id },
      data: {
        total: payload.total,
        scoreData: payload.scoreData as Prisma.InputJsonValue,
      },
    });
    updatedCount += 1;
  }

  if (isComplete && !commoditiesMeta.sessionComplete) {
    await prisma.competitionEvent.update({
      where: { id: event.id },
      data: {
        metadata: mergeCommoditiesEventMetadata(event.metadata, {
          commodities: { sessionComplete: true },
        }) as Prisma.InputJsonValue,
      },
    });
  }

  console.log(`[commodities] Synced live scores for ${updatedCount} contracts on ${eventId}`);
}
