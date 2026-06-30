import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { CommodityParticipantMetadata } from "@cut/sport-commodities";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import {
  COMMODITY_CATALOG,
  commodityExternalId,
} from "./commodityCatalog.js";
import { syncCommoditiesPriceHistory } from "./syncPriceHistory.js";
import { syncCommoditiesQuotes } from "./syncQuotes.js";

function parseParticipantMetadata(metadata: unknown): CommodityParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as CommodityParticipantMetadata;
}

export async function syncCommoditiesParticipantField(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  for (const entry of COMMODITY_CATALOG) {
    const externalId = commodityExternalId(entry.symbol);
    const existing = await prisma.participant.findUnique({
      where: {
        sportId_externalId: {
          sportId: COMMODITIES_SPORT_ID,
          externalId,
        },
      },
      select: { metadata: true },
    });
    const participantMetadata: CommodityParticipantMetadata = {
      ...parseParticipantMetadata(existing?.metadata),
      sector: entry.sector,
      iconKey: entry.iconKey,
      symbol: entry.symbol,
    };

    const participant = await prisma.participant.upsert({
      where: {
        sportId_externalId: {
          sportId: COMMODITIES_SPORT_ID,
          externalId,
        },
      },
      create: {
        sportId: COMMODITIES_SPORT_ID,
        externalId,
        displayName: entry.displayName,
        metadata: participantMetadata as Prisma.InputJsonValue,
      },
      update: {
        displayName: entry.displayName,
        metadata: participantMetadata as Prisma.InputJsonValue,
      },
    });

    await prisma.eventParticipant.upsert({
      where: {
        eventId_participantId: {
          eventId: event.id,
          participantId: participant.id,
        },
      },
      create: {
        eventId: event.id,
        participantId: participant.id,
        scoreData: {},
        total: 0,
      },
      update: {},
    });
  }

  console.log(`[commodities] Synced field for ${eventId}: ${COMMODITY_CATALOG.length} contracts`);
  await syncCommoditiesQuotes(eventId);
  await syncCommoditiesPriceHistory(eventId);
}
