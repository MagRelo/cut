import {
  buildGenericScoringModel,
  extractGenericHoleOutcomes,
  PGA_GOLF_SPORT_ID,
  type GenericScoringModel,
} from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";

export interface LoadedGenericScoringModel {
  model: GenericScoringModel;
  eventParticipantCount: number;
  holeSampleCount: number;
}

/**
 * Builds an anonymous field-wide scoring distribution from prior PGA events.
 * Current-event outcomes are excluded so a report stays stable as live holes arrive.
 */
export async function loadGenericGolfScoringModel(
  currentEventId: string,
): Promise<LoadedGenericScoringModel> {
  const rows = await prisma.eventParticipant.findMany({
    where: {
      eventId: { not: currentEventId },
      event: { sportId: PGA_GOLF_SPORT_ID },
    },
    select: { scoreData: true },
  });
  const outcomes = extractGenericHoleOutcomes(rows.map((row) => row.scoreData));
  return {
    model: buildGenericScoringModel(outcomes),
    eventParticipantCount: rows.length,
    holeSampleCount: outcomes.length,
  };
}
