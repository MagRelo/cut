import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { COMMODITIES_SPORT_ID, parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import { parseCommoditiesSessionExternalId } from "./externalId.js";
import { formatSessionDisplayName, resolveSessionBounds } from "./sessionConfig.js";
import { mergeCommoditiesEventMetadata } from "./metadataMerge.js";

export async function syncCommoditiesEventMetadata(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  const sessionDate = parseCommoditiesSessionExternalId(event.externalId);
  const defaultBounds = resolveSessionBounds(sessionDate);
  const existingCommodities = parseCommoditiesEventMetadata(event.metadata);
  const sessionOpen = existingCommodities?.sessionOpen ?? defaultBounds.sessionOpen;
  const sessionClose = existingCommodities?.sessionClose ?? defaultBounds.sessionClose;

  const now = new Date();
  const sessionStarted =
    existingCommodities?.sessionStarted === true || now >= new Date(sessionOpen);
  const sessionComplete =
    existingCommodities?.sessionComplete === true || now >= new Date(sessionClose);

  const commoditiesPatch: {
    sessionDate: string;
    sessionOpen?: string;
    sessionClose?: string;
    sessionStarted: boolean;
    sessionComplete: boolean;
  } = {
    sessionDate,
    sessionStarted,
    sessionComplete,
  };

  if (!existingCommodities?.sessionOpen) {
    commoditiesPatch.sessionOpen = defaultBounds.sessionOpen;
  }
  if (!existingCommodities?.sessionClose) {
    commoditiesPatch.sessionClose = defaultBounds.sessionClose;
  }

  const metadata = mergeCommoditiesEventMetadata(event.metadata, {
    name: formatSessionDisplayName(sessionDate),
    commodities: commoditiesPatch,
  });

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });
}
