import type { EventParticipant, Participant } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

type ParticipantMetadata = {
  pgaTourId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

type ScoreData = {
  leaderboardPosition?: string | null;
};

export type PlacementPlayerDto = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

export function eventDisplayName(event: {
  externalId: string;
  metadata: unknown;
}): string {
  if (event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)) {
    const name = (event.metadata as { name?: string }).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return event.externalId;
}

export function participantPgaTourId(participant: Participant): string | null {
  const externalId =
    typeof participant.externalId === "string" ? participant.externalId.trim() : "";
  if (participant.metadata && typeof participant.metadata === "object") {
    const pgaTourId = (participant.metadata as ParticipantMetadata).pgaTourId;
    if (typeof pgaTourId === "string" && pgaTourId.trim()) return pgaTourId.trim();
  }
  return externalId || null;
}

export function participantNameParts(participant: Participant): {
  firstName: string | null;
  lastName: string | null;
} {
  if (participant.metadata && typeof participant.metadata === "object") {
    const meta = participant.metadata as ParticipantMetadata;
    return {
      firstName: meta.firstName ?? null,
      lastName: meta.lastName ?? null,
    };
  }
  return { firstName: null, lastName: null };
}

export function eventParticipantLeaderboardPosition(
  eventParticipant: Pick<EventParticipant, "scoreData">,
): string | null {
  if (!eventParticipant.scoreData || typeof eventParticipant.scoreData !== "object") {
    return null;
  }
  const position = (eventParticipant.scoreData as ScoreData).leaderboardPosition;
  return typeof position === "string" ? position : null;
}

export function sortedEventParticipantIds(
  picks: { eventParticipantId: string }[],
): string[] {
  return [...picks.map((pick) => pick.eventParticipantId)].sort((a, b) =>
    a.localeCompare(b),
  );
}

export async function placementPlayersMapForTickets(
  eventId: string,
  tickets: { id: string; eventParticipantIds: string[] }[],
): Promise<Map<string, PlacementPlayerDto[]>> {
  const allIds = [...new Set(tickets.flatMap((ticket) => ticket.eventParticipantIds))];
  const byEventParticipantId = new Map<string, PlacementPlayerDto>();

  if (allIds.length > 0) {
    const rows = await prisma.eventParticipant.findMany({
      where: { eventId, id: { in: allIds } },
      include: { participant: true },
    });

    for (const row of rows) {
      const names = participantNameParts(row.participant);
      byEventParticipantId.set(row.id, {
        id: row.id,
        firstName: names.firstName,
        lastName: names.lastName,
      });
    }
  }

  const out = new Map<string, PlacementPlayerDto[]>();
  for (const ticket of tickets) {
    const list = [...ticket.eventParticipantIds]
      .sort((a, b) => a.localeCompare(b))
      .map(
        (id) =>
          byEventParticipantId.get(id) ?? {
            id,
            firstName: null,
            lastName: null,
          },
      );
    out.set(ticket.id, list);
  }

  return out;
}
