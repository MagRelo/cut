import type { RosterRules } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";

export async function validateLineupPicks(
  eventId: string,
  sportId: string,
  picks: string[],
): Promise<
  | { ok: true; participantIds: string[] }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "validation"; messages: string[] }
> {
  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    include: { sport: true },
  });

  if (!event) {
    return { ok: false, error: "not_found" };
  }

  const rosterRules = event.sport.rosterRules as unknown as RosterRules;
  const sportModule = requireSportModule(sportId);
  const validation = await sportModule.validateRoster(eventId, picks, rosterRules);

  if (!validation.valid) {
    return { ok: false, error: "validation", messages: validation.errors };
  }

  if (picks.length === 0) {
    return { ok: true, participantIds: [] };
  }

  const eventParticipants = await prisma.eventParticipant.findMany({
    where: {
      eventId,
      id: { in: picks },
    },
    select: { id: true, participantId: true },
  });

  if (eventParticipants.length !== picks.length) {
    return {
      ok: false,
      error: "validation",
      messages: ["One or more picks are not in this event"],
    };
  }

  const participantIdByEventParticipantId = new Map(
    eventParticipants.map((row) => [row.id, row.participantId]),
  );
  const participantIds = picks.map(
    (pickId) => participantIdByEventParticipantId.get(pickId)!,
  );

  return { ok: true, participantIds };
}

export async function writeLineupPicks(lineupId: string, picks: string[]) {
  await prisma.lineupPick.deleteMany({ where: { lineupId } });

  if (picks.length > 0) {
    await prisma.lineupPick.createMany({
      data: picks.map((eventParticipantId, index) => ({
        lineupId,
        eventParticipantId,
        slotIndex: index,
      })),
    });
  }
}
