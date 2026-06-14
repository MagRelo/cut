import { prisma } from "../../lib/prisma.js";
import { getActivePlayers } from "../../lib/pgaField.js";
import { fetchPGATourPlayers } from "../../lib/pgaPlayers.js";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";

export async function syncGolfParticipantField(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: PGA_GOLF_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Golf event not found: ${eventId}`);
  }

  const fieldData = await getActivePlayers(event.externalId);
  const fieldPlayerIds = new Set(fieldData.players.map((player) => player.id));

  const directoryPlayers = await fetchPGATourPlayers();
  const directoryById = new Map(directoryPlayers.map((player) => [player.id, player]));

  for (const fieldPlayer of fieldData.players) {
    const directory = directoryById.get(fieldPlayer.id);
    const displayName =
      directory?.displayName ??
      `${fieldPlayer.firstName ?? ""} ${fieldPlayer.lastName ?? ""}`.trim();

    const participant = await prisma.participant.upsert({
      where: {
        sportId_externalId: {
          sportId: PGA_GOLF_SPORT_ID,
          externalId: fieldPlayer.id,
        },
      },
      create: {
        sportId: PGA_GOLF_SPORT_ID,
        externalId: fieldPlayer.id,
        displayName,
        metadata: {
          pgaTourId: fieldPlayer.id,
          firstName: fieldPlayer.firstName ?? directory?.firstName,
          lastName: fieldPlayer.lastName ?? directory?.lastName,
          displayName,
          owgr: fieldPlayer.owgr?.toString(),
          inField: true,
          isActive: true,
        },
      },
      update: {
        displayName,
        metadata: {
          pgaTourId: fieldPlayer.id,
          firstName: fieldPlayer.firstName ?? directory?.firstName,
          lastName: fieldPlayer.lastName ?? directory?.lastName,
          displayName,
          owgr: fieldPlayer.owgr?.toString(),
          inField: true,
          isActive: true,
        },
      },
    });

    await prisma.eventParticipant.upsert({
      where: {
        eventId_participantId: {
          eventId: event.id,
          participantId: participant.id,
        },
      },
      create: {
        eventId: event.id,
        participantId: participant.id,
        scoreData: {},
        total: 0,
      },
      update: {},
    });
  }

  const eventParticipants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  });

  for (const row of eventParticipants) {
    const externalId = row.participant.externalId;
    if (!externalId || !fieldPlayerIds.has(externalId)) {
      await prisma.participant.update({
        where: { id: row.participantId },
        data: {
          metadata: {
            ...(typeof row.participant.metadata === "object" && row.participant.metadata
              ? row.participant.metadata
              : {}),
            inField: false,
          },
        },
      });
    }
  }
}
