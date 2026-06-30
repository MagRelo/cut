import { Prisma } from "@prisma/client";
import type { CommodityParticipantMetadata } from "@cut/sport-commodities";
import { COMMODITIES_SPORT_ID, getEventFieldSnapshot, parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import { prisma } from "../../lib/prisma.js";
import { commodityExternalId } from "@cut/sport-commodities";
import { mergeCommoditiesEventMetadata } from "./metadataMerge.js";
import { COMMODITY_PRICE_HISTORY_POINTS } from "./fixtureMarketData.js";
import { fetchPriceHistoryForField } from "./marketDataProvider.js";

function parseParticipantMetadata(metadata: unknown): CommodityParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as CommodityParticipantMetadata;
}

/** Write sparkline closes once per event. */
export async function syncCommoditiesPriceHistory(eventId: string): Promise<void> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  const commodities = parseCommoditiesEventMetadata(event.metadata);
  if (commodities?.priceHistorySyncedAt) {
    return;
  }

  const field = getEventFieldSnapshot(event.metadata);
  if (field.length === 0) {
    return;
  }

  const histories = await fetchPriceHistoryForField(field, COMMODITY_PRICE_HISTORY_POINTS);

  const participants = await prisma.participant.findMany({
    where: { sportId: COMMODITIES_SPORT_ID },
    select: { id: true, externalId: true, metadata: true },
  });
  const participantByExternalId = new Map(
    participants.map((row) => [row.externalId, row]),
  );

  for (const entry of field) {
    const externalId = commodityExternalId(entry.ticker);
    const row = participantByExternalId.get(externalId);
    if (!row) {
      continue;
    }

    const existingMeta = parseParticipantMetadata(row.metadata);
    const closes = histories.get(entry.ticker) ?? [];

    await prisma.participant.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...existingMeta,
          priceHistory: closes,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.competitionEvent.update({
    where: { id: eventId },
    data: {
      metadata: mergeCommoditiesEventMetadata(event.metadata, {
        commodities: { priceHistorySyncedAt: new Date().toISOString() },
      }) as Prisma.InputJsonValue,
    },
  });

  console.log(`[commodities] Price history synced for event ${eventId}`);
}
