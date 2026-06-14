import type { EventStatus } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";

export type ActiveEventResponse = {
  sport: {
    id: string;
    name: string;
    slug: string;
    rosterRules: unknown;
    scoringRules: unknown;
  };
  event: {
    id: string;
    sportId: string;
    externalId: string;
    isActive: boolean;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  };
  status: EventStatus;
};

export async function getActiveEventForSport(
  sportId: string,
): Promise<ActiveEventResponse | null> {
  const sport = await prisma.sport.findFirst({
    where: { id: sportId, isEnabled: true },
  });

  if (!sport) {
    return null;
  }

  const event = await prisma.competitionEvent.findFirst({
    where: { sportId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!event) {
    return null;
  }

  const sportModule = requireSportModule(sportId);
  const status = await sportModule.getEventStatus(event.id);

  return {
    sport: {
      id: sport.id,
      name: sport.name,
      slug: sport.slug,
      rosterRules: sport.rosterRules,
      scoringRules: sport.scoringRules,
    },
    event: {
      id: event.id,
      sportId: event.sportId,
      externalId: event.externalId,
      isActive: event.isActive,
      metadata: event.metadata,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    },
    status,
  };
}
