import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  commoditiesEventStatusFromMetadata,
  COMMODITIES_SPORT_ID,
  commoditiesShouldSyncLiveScores,
  getEventFieldSnapshot,
  transformCommodityDailyPrice,
  type CommodityScoreData,
} from "@cut/sport-commodities";
import { commodityExternalId } from "@cut/sport-commodities";
import { getSessionPricesForField } from "./marketDataProvider.js";
import { mergeCommoditiesEventMetadata, requireCommoditiesMetadata } from "./metadataMerge.js";
import { findFieldEntryByTicker } from "./hyperliquidCatalog.js";
import { commoditiesCurrentPeriod } from "./sessionRounds.js";

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
  const field = getEventFieldSnapshot(event.metadata);
  if (field.length === 0) {
    throw new Error(`Event ${eventId} is missing commodities.fieldSnapshot`);
  }

  const eventStatus = commoditiesEventStatusFromMetadata(event.metadata);
  const isComplete = eventStatus === "COMPLETE";
  const currentPeriod = commoditiesCurrentPeriod(
    commoditiesMeta.sessionOpen,
    commoditiesMeta.sessionClose,
  );

  const eventParticipants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  });

  const existingScoresByTicker = new Map<string, CommodityScoreData | null | undefined>();
  for (const row of eventParticipants) {
    const ticker = commodityExternalId(row.participant.externalId ?? "");
    const scoreData = row.scoreData as CommodityScoreData | null;
    existingScoresByTicker.set(ticker, scoreData);
  }

  const prices = await getSessionPricesForField({
    field,
    sessionOpen: commoditiesMeta.sessionOpen,
    sessionClose: commoditiesMeta.sessionClose,
    isComplete,
    existingScoresByTicker,
  });

  let updatedCount = 0;

  for (const eventParticipant of eventParticipants) {
    const ticker = commodityExternalId(eventParticipant.participant.externalId ?? "");
    const fieldEntry = findFieldEntryByTicker(field, ticker);
    if (!fieldEntry) {
      continue;
    }

    const snapshot = prices.get(ticker);
    const payload = transformCommodityDailyPrice({
      openPrice: snapshot?.openPrice ?? null,
      dayClosePrices: snapshot?.dayClosePrices ?? [],
      currentPrice: snapshot?.currentPrice ?? null,
      closePrice: snapshot?.closePrice ?? null,
      isComplete,
      currentPeriod,
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
