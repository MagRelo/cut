import { Prisma } from "@prisma/client";
import type { CommodityParticipantMetadata } from "@cut/sport-commodities";
import { COMMODITIES_SPORT_ID, parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import { prisma } from "../../lib/prisma.js";
import {
  COMMODITY_CATALOG,
  commodityExternalId,
} from "./commodityCatalog.js";
import { mergeCommoditiesEventMetadata } from "./metadataMerge.js";
import {
  COMMODITY_PRICE_HISTORY_POINTS,
  fixturePriceHistory,
} from "./fixtureMarketData.js";

function parseParticipantMetadata(metadata: unknown): CommodityParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as CommodityParticipantMetadata;
}

/** Write deterministic sparkline closes once per event. */
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

  const participants = await prisma.participant.findMany({
    where: { sportId: COMMODITIES_SPORT_ID },
    select: { id: true, externalId: true, metadata: true },
  });
  const participantByExternalId = new Map(
    participants.map((row) => [row.externalId, row]),
  );

  for (const entry of COMMODITY_CATALOG) {
    const externalId = commodityExternalId(entry.symbol);
    const row = participantByExternalId.get(externalId);
    if (!row) {
      continue;
    }

    const existingMeta = parseParticipantMetadata(row.metadata);
    if (existingMeta.priceHistory?.length) {
      continue;
    }

    const closes = fixturePriceHistory(entry.symbol, COMMODITY_PRICE_HISTORY_POINTS);
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

  console.log(`[commodities] Fixture price history synced for event ${eventId}`);
}
