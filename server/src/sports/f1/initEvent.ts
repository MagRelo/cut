import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { F1_SPORT_ID } from "@cut/sport-f1";
import { resolveRaceContext } from "./openf1Client.js";
import { mergeF1EventMetadata } from "./metadataMerge.js";
import { syncF1EventMetadata } from "./syncMetadata.js";
import { syncF1ParticipantField } from "./syncField.js";

export async function initF1Event(externalId: string) {
  const normalizedExternalId = externalId.trim();
  if (!normalizedExternalId) {
    throw new Error("externalId is required");
  }

  const raceContext = await resolveRaceContext(normalizedExternalId);

  let event = await prisma.competitionEvent.findFirst({
    where: { sportId: F1_SPORT_ID, externalId: normalizedExternalId },
  });

  const initialMetadata = mergeF1EventMetadata(event?.metadata, {
    name: raceContext.raceName,
    f1: {
      ...raceContext,
      classificationComplete: false,
    },
  });

  if (!event) {
    event = await prisma.competitionEvent.create({
      data: {
        sportId: F1_SPORT_ID,
        externalId: normalizedExternalId,
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

  await syncF1EventMetadata(event.id);
  await syncF1ParticipantField(event.id);

  await prisma.competitionEvent.updateMany({
    where: { sportId: F1_SPORT_ID, isActive: true },
    data: { isActive: false },
  });

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { isActive: true },
  });

  console.log(`[f1] Initialized event ${event.id} (${normalizedExternalId})`);
}
