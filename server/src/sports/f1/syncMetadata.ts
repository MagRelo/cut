import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { F1_SPORT_ID } from "@cut/sport-f1";
import {
  fetchSessionByKey,
  fetchSessionResults,
  resolveRaceContext,
} from "./openf1Client.js";
import { mergeF1EventMetadata, requireF1Metadata } from "./metadataMerge.js";

export async function syncF1EventMetadata(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: F1_SPORT_ID },
  });

  if (!event) {
    throw new Error(`F1 event not found: ${eventId}`);
  }

  let f1Meta = parseF1EventMetadataSafe(event.metadata);
  if (!f1Meta) {
    const resolved = await resolveRaceContext(event.externalId);
    f1Meta = { ...resolved, classificationComplete: false };
  }

  const session = await fetchSessionByKey(f1Meta.sessionKey);
  const results = await fetchSessionResults(f1Meta.sessionKey);
  const classificationComplete = results.length > 0;

  const metadata = mergeF1EventMetadata(event.metadata, {
    name: f1Meta.raceName,
    f1: {
      ...f1Meta,
      raceStart: session.date_start,
      raceEnd: session.date_end,
      sessionKey: session.session_key,
      classificationComplete,
    },
  });

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });
}

function parseF1EventMetadataSafe(metadata: unknown) {
  try {
    return requireF1Metadata(metadata);
  } catch {
    return null;
  }
}
