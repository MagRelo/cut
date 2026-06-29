import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { parseCommoditiesSessionExternalId } from "./externalId.js";
import {
  formatSessionDisplayName,
  resolveSessionBounds,
} from "./sessionConfig.js";
import { mergeCommoditiesEventMetadata } from "./metadataMerge.js";

export async function syncCommoditiesEventMetadata(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Commodities event not found: ${eventId}`);
  }

  const sessionDate = parseCommoditiesSessionExternalId(event.externalId);
  const bounds = resolveSessionBounds(sessionDate);
  const now = new Date();
  const sessionComplete = now >= new Date(bounds.sessionClose);

  const metadata = mergeCommoditiesEventMetadata(event.metadata, {
    name: formatSessionDisplayName(sessionDate),
    commodities: {
      sessionDate,
      sessionOpen: bounds.sessionOpen,
      sessionClose: bounds.sessionClose,
      sessionComplete,
    },
  });

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });
}
