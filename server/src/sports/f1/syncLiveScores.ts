import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  f1ShouldSyncLiveScores,
  F1_SPORT_ID,
  transformProvisionalPosition,
  transformSessionResult,
} from "@cut/sport-f1";
import {
  fetchLatestPositions,
  fetchSessionResults,
  parseDriverExternalId,
} from "./openf1Client.js";
import { mergeF1EventMetadata, requireF1Metadata } from "./metadataMerge.js";

export async function syncF1LiveScores(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: F1_SPORT_ID },
  });

  if (!event) {
    throw new Error(`F1 event not found: ${eventId}`);
  }

  if (!f1ShouldSyncLiveScores(event.metadata)) {
    console.log(`[f1] Skipping live score sync for ${eventId} (event not live)`);
    return;
  }

  const f1Meta = requireF1Metadata(event.metadata);
  const sessionKey = f1Meta.sessionKey;

  const eventParticipants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  });

  const results = await fetchSessionResults(sessionKey);
  let updatedCount = 0;

  if (results.length > 0) {
    const resultsByDriver = new Map(results.map((row) => [row.driver_number, row]));

    for (const eventParticipant of eventParticipants) {
      const driverNumber = parseDriverExternalId(eventParticipant.participant.externalId);
      if (driverNumber == null) continue;

      const result = resultsByDriver.get(driverNumber);
      if (!result) continue;

      const payload = transformSessionResult({
        position: result.position,
        driverNumber: result.driver_number,
        points: result.points,
        dnf: result.dnf,
        dns: result.dns,
        dsq: result.dsq,
        numberOfLaps: result.number_of_laps ?? null,
      });

      await prisma.eventParticipant.update({
        where: { id: eventParticipant.id },
        data: {
          total: payload.total,
          scoreData: payload.scoreData as Prisma.InputJsonValue,
        },
      });
      updatedCount += 1;
    }

    if (!f1Meta.classificationComplete) {
      await prisma.competitionEvent.update({
        where: { id: event.id },
        data: {
          metadata: mergeF1EventMetadata(event.metadata, {
            f1: { classificationComplete: true },
          }) as Prisma.InputJsonValue,
        },
      });
    }
  } else {
    const positions = await fetchLatestPositions(sessionKey);
    const positionsByDriver = new Map(positions.map((row) => [row.driver_number, row]));

    for (const eventParticipant of eventParticipants) {
      const driverNumber = parseDriverExternalId(eventParticipant.participant.externalId);
      if (driverNumber == null) continue;

      const positionRow = positionsByDriver.get(driverNumber);
      if (!positionRow) continue;

      const payload = transformProvisionalPosition({
        driverNumber: positionRow.driver_number,
        position: positionRow.position,
        lapsCompleted: positionRow.number_of_laps ?? null,
      });

      await prisma.eventParticipant.update({
        where: { id: eventParticipant.id },
        data: {
          total: payload.total,
          scoreData: payload.scoreData as Prisma.InputJsonValue,
        },
      });
      updatedCount += 1;
    }
  }

  console.log(`[f1] Synced live scores for ${updatedCount} participants on ${eventId}`);
}
