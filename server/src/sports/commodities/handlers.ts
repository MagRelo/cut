import type { CommoditiesHandlers } from "@cut/sport-commodities";
import { validateCommoditiesRoster, COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { prisma } from "../../lib/prisma.js";
import { initCommoditiesEvent } from "./initEvent.js";
import { syncCommoditiesEventMetadata } from "./syncMetadata.js";
import { syncCommoditiesParticipantField } from "./syncField.js";
import { syncCommoditiesLiveScores } from "./syncLiveScores.js";

export function createCommoditiesHandlers(): CommoditiesHandlers {
  return {
    initEvent: initCommoditiesEvent,
    syncEventMetadata: syncCommoditiesEventMetadata,
    syncParticipantField: syncCommoditiesParticipantField,
    syncLiveScores: syncCommoditiesLiveScores,

    async getEventMetadata(eventId) {
      const event = await prisma.competitionEvent.findFirst({
        where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
        select: { metadata: true },
      });
      return event?.metadata ?? null;
    },

    async getCandidateRows(eventId) {
      const rows = await prisma.eventParticipant.findMany({
        where: {
          eventId,
          participant: { sportId: COMMODITIES_SPORT_ID },
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

      return rows.map((row) => ({
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
      return validateCommoditiesRoster(picks, rules, validIds);
    },
  };
}
