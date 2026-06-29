import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { parseCommoditiesSessionExternalId } from "./externalId.js";
import {
  formatSessionDisplayName,
  resolveSessionBounds,
} from "./sessionConfig.js";
import { mergeCommoditiesEventMetadata } from "./metadataMerge.js";
import { syncCommoditiesEventMetadata } from "./syncMetadata.js";
import { syncCommoditiesParticipantField } from "./syncField.js";

export async function initCommoditiesEvent(externalId: string) {
  const sessionDate = parseCommoditiesSessionExternalId(externalId);
  const bounds = resolveSessionBounds(sessionDate);

  let event = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, externalId: sessionDate },
  });

  const initialMetadata = mergeCommoditiesEventMetadata(event?.metadata, {
    name: formatSessionDisplayName(sessionDate),
    commodities: {
      sessionDate,
      sessionOpen: bounds.sessionOpen,
      sessionClose: bounds.sessionClose,
      sessionComplete: false,
    },
  });

  if (!event) {
    event = await prisma.competitionEvent.create({
      data: {
        sportId: COMMODITIES_SPORT_ID,
        externalId: sessionDate,
        isActive: false,
        metadata: initialMetadata as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.competitionEvent.update({
      where: { id: event.id },
      data: { metadata: initialMetadata as Prisma.InputJsonValue },
    });
  }

  await syncCommoditiesEventMetadata(event.id);
  await syncCommoditiesParticipantField(event.id);

  await prisma.competitionEvent.updateMany({
    where: { sportId: COMMODITIES_SPORT_ID, isActive: true },
    data: { isActive: false },
  });

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { isActive: true },
  });

  console.log(`[commodities] Initialized event ${event.id} (${sessionDate})`);
}
