import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { CommodityParticipantMetadata } from "@cut/sport-commodities";
import { COMMODITIES_SPORT_ID, commodityExternalId, getEventFieldSnapshot } from "@cut/sport-commodities";
import {
  buildCommodityCatalog,
  buildFieldSnapshot,
} from "./hyperliquidCatalog.js";
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

  const field = getEventFieldSnapshot(event.metadata);
  if (field.length === 0) {
    throw new Error(
      `Event ${eventId} is missing commodities.fieldSnapshot — run init-event first`,
    );
  }

  for (const entry of field) {
    const externalId = commodityExternalId(entry.ticker);
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
      symbol: entry.ticker,
      hlCoin: entry.hlCoin,
      hlDex: entry.hlDex,
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

  console.log(`[commodities] Synced field for ${eventId}: ${field.length} contracts`);
  await syncCommoditiesQuotes(eventId);
  await syncCommoditiesPriceHistory(eventId);
}

/** Resolve catalog and return field snapshot for event metadata. */
export async function resolveCommodityFieldSnapshot() {
  const catalog = await buildCommodityCatalog();
  return buildFieldSnapshot(catalog);
}
