import type { CompetitionEventShell } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";

export async function getEventForSport(
  sportId: string,
  eventId: string,
): Promise<CompetitionEventShell | null> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId },
    select: {
      id: true,
      sportId: true,
      externalId: true,
      isActive: true,
      metadata: true,
    },
  });

  if (!event) return null;

  return {
    id: event.id,
    sportId: event.sportId,
    externalId: event.externalId,
    isActive: event.isActive,
    metadata: event.metadata,
  };
}
