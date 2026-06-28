import type { F1Handlers } from "@cut/sport-f1";
import { validateF1Roster, F1_SPORT_ID } from "@cut/sport-f1";
import { prisma } from "../../lib/prisma.js";
import { initF1Event } from "./initEvent.js";
import { syncF1EventMetadata } from "./syncMetadata.js";
import { syncF1ParticipantField } from "./syncField.js";
import { syncF1LiveScores } from "./syncLiveScores.js";

export function createF1Handlers(): F1Handlers {
  return {
    initEvent: initF1Event,
    syncEventMetadata: syncF1EventMetadata,
    syncParticipantField: syncF1ParticipantField,
    syncLiveScores: syncF1LiveScores,

    async getEventMetadata(eventId) {
      const event = await prisma.competitionEvent.findFirst({
        where: { id: eventId, sportId: F1_SPORT_ID },
        select: { metadata: true },
      });
      return event?.metadata ?? null;
    },

    async getCandidateRows(eventId) {
      const rows = await prisma.eventParticipant.findMany({
        where: {
          eventId,
          participant: {
            sportId: F1_SPORT_ID,
          },
        },
        include: {
          participant: {
            select: {
              displayName: true,
              externalId: true,
              metadata: true,
            },
          },
        },
        orderBy: { participant: { displayName: "asc" } },
      });

      return rows
        .filter((row) => {
          const metadata = row.participant.metadata;
          if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
            return true;
          }
          return (metadata as Record<string, unknown>).inField !== false;
        })
        .map((row) => ({
          id: row.id,
          participantId: row.participantId,
          total: row.total,
          scoreData: row.scoreData,
          participant: row.participant,
        }));
    },

    async getEventParticipantTotals(_eventId, eventParticipantIds) {
      if (eventParticipantIds.length === 0) {
        return 0;
      }

      const rows = await prisma.eventParticipant.findMany({
        where: { id: { in: eventParticipantIds } },
        select: { total: true },
      });

      return rows.reduce((sum, row) => sum + (row.total ?? 0), 0);
    },

    async validateRoster(eventId, picks, rules) {
      const rows = await prisma.eventParticipant.findMany({
        where: { eventId },
        select: { id: true },
      });
      const validIds = new Set(rows.map((row) => row.id));
      return validateF1Roster(picks, rules, validIds);
    },
  };
}
