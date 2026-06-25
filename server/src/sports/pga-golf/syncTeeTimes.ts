import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  buildPgaTourIdToTeeTimesMap,
  buildStoredTeeTimes,
  dataGolfTourFromEnv,
  fetchDataGolfFieldUpdates,
} from "../../services/odds/dataGolfFieldUpdates.js";
import { parseGolfEventMetadata, PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";

function asScoreDataRecord(scoreData: unknown): Record<string, unknown> {
  if (!scoreData || typeof scoreData !== "object" || Array.isArray(scoreData)) {
    return {};
  }
  return { ...(scoreData as Record<string, unknown>) };
}

function participantInField(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return true;
  }
  return (metadata as Record<string, unknown>).inField !== false;
}

/**
 * Syncs DataGolf tee times onto `EventParticipant.scoreData.teeTimes`.
 * Preserves existing score fields (leaderboard, rounds, stableford).
 */
export async function syncGolfTeeTimes(eventId: string): Promise<number> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: PGA_GOLF_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Golf event not found: ${eventId}`);
  }

  const golfMeta = parseGolfEventMetadata(event.metadata);
  const timezone = golfMeta?.timezone?.trim();
  if (!timezone) {
    console.warn(`[pga-golf] Skipping tee time sync for ${eventId}: event timezone missing`);
    return 0;
  }

  let fieldPayload;
  try {
    fieldPayload = await fetchDataGolfFieldUpdates(dataGolfTourFromEnv());
  } catch (error) {
    console.warn(
      "[pga-golf] Tee time sync skipped (DataGolf field-updates unavailable):",
      error instanceof Error ? error.message : error,
    );
    return 0;
  }

  const teeTimesByPgaId = buildPgaTourIdToTeeTimesMap(fieldPayload.field);
  if (teeTimesByPgaId.size === 0) {
    console.log(`[pga-golf] No tee times in DataGolf field-updates for ${eventId}`);
    return 0;
  }

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  });

  let updated = 0;

  for (const row of rows) {
    if (!participantInField(row.participant.metadata)) {
      continue;
    }

    const pgaTourId = row.participant.externalId?.trim();
    if (!pgaTourId) {
      continue;
    }

    const rawTeeTimes = teeTimesByPgaId.get(pgaTourId);
    if (!rawTeeTimes?.length) {
      continue;
    }

    const teeTimes = buildStoredTeeTimes(rawTeeTimes, timezone);
    if (teeTimes.length === 0) {
      continue;
    }

    const scoreData = asScoreDataRecord(row.scoreData);
    scoreData.teeTimes = teeTimes;

    await prisma.eventParticipant.update({
      where: { id: row.id },
      data: { scoreData: scoreData as Prisma.InputJsonValue },
    });
    updated++;
  }

  console.log(`[pga-golf] Synced tee times for ${updated} participants on ${eventId}`);
  return updated;
}
