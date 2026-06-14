import type { Candidate } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";

export async function getEventCandidates(
  sportId: string,
  eventId: string,
): Promise<Candidate[] | null> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId },
  });

  if (!event) {
    return null;
  }

  const sportModule = requireSportModule(sportId);
  return sportModule.getCandidatePool(eventId);
}
