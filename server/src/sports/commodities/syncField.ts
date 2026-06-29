import { prisma } from "../../lib/prisma.js";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import {
  COMMODITY_CATALOG,
  commodityExternalId,
} from "./commodityCatalog.js";

export async function syncCommoditiesParticipantField(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  for (const entry of COMMODITY_CATALOG) {
    const externalId = commodityExternalId(entry.yahooSymbol);
    const participantMetadata = {
      sector: entry.sector,
      iconKey: entry.iconKey,
      yahooSymbol: entry.yahooSymbol,
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
        metadata: participantMetadata,
      },
      update: {
        displayName: entry.displayName,
        metadata: participantMetadata,
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
}
