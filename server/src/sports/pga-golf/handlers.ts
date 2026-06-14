import type { PgaGolfHandlers } from "@cut/sport-pga-golf";
import { validateGolfRoster, PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";
import { initGolfEvent } from "./initEvent.js";
import { syncGolfEventMetadata } from "./syncMetadata.js";
import { syncGolfParticipantField } from "./syncField.js";
import { syncGolfLiveScores } from "./syncLiveScores.js";

export function createPgaGolfHandlers(): PgaGolfHandlers {
  return {
    initEvent: initGolfEvent,
    syncEventMetadata: syncGolfEventMetadata,
    syncParticipantField: syncGolfParticipantField,
    syncLiveScores: syncGolfLiveScores,

    async getEventMetadata(eventId) {
      const event = await prisma.competitionEvent.findFirst({
        where: { id: eventId, sportId: PGA_GOLF_SPORT_ID },
        select: { metadata: true },
      });
      return event?.metadata ?? null;
    },

    async getCandidateRows(eventId) {
      const rows = await prisma.eventParticipant.findMany({
        where: {
          eventId,
          participant: {
            sportId: PGA_GOLF_SPORT_ID,
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
      return validateGolfRoster(picks, rules, validIds);
    },
  };
}
