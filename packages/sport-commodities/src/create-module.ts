import type { SportModule } from "@cut/sport-sdk";
import { defaultPayoutVector } from "@cut/sport-sdk";
import { rankCommoditiesEntries } from "./ranking.js";
import {
  commoditiesEventStatusFromMetadata,
  commoditiesShouldSyncLiveScores,
} from "./status.js";
import { COMMODITIES_SPORT_ID } from "./metadata.js";

export type CommoditiesHandlers = {
  initEvent(externalId: string): Promise<void>;
  syncEventMetadata(eventId: string): Promise<void>;
  syncParticipantField(eventId: string): Promise<void>;
  syncLiveScores(eventId: string): Promise<void>;
  getEventMetadata(eventId: string): Promise<unknown | null>;
  getCandidateRows(eventId: string): Promise<import("./candidates.js").EventParticipantRow[]>;
  getEventParticipantTotals(
    eventId: string,
    eventParticipantIds: string[],
  ): Promise<number>;
  validateRoster(
    eventId: string,
    picks: string[],
    rules: import("@cut/sport-sdk").RosterRules,
  ): Promise<import("@cut/sport-sdk").ValidationResult>;
};

export function createCommoditiesModule(handlers: CommoditiesHandlers): SportModule {
  return {
    id: COMMODITIES_SPORT_ID,

    initEvent: handlers.initEvent,
    syncEventMetadata: handlers.syncEventMetadata,
    syncParticipantField: handlers.syncParticipantField,
    syncLiveScores: handlers.syncLiveScores,

    async shouldSyncLiveScores(eventId) {
      const metadata = await handlers.getEventMetadata(eventId);
      return commoditiesShouldSyncLiveScores(metadata);
    },

    async getEventStatus(eventId) {
      const metadata = await handlers.getEventMetadata(eventId);
      return commoditiesEventStatusFromMetadata(metadata);
    },

    async getCandidatePool(eventId) {
      const { buildCommoditiesCandidates } = await import("./candidates.js");
      const rows = await handlers.getCandidateRows(eventId);
      return buildCommoditiesCandidates(rows);
    },

    validateRoster: handlers.validateRoster,

    async aggregateLineupScore(_eventId, eventParticipantIds) {
      return handlers.getEventParticipantTotals(_eventId, eventParticipantIds);
    },

    rankEntries: rankCommoditiesEntries,

    shouldActivateContest(eventStatus) {
      return eventStatus === "LIVE";
    },

    shouldSettleContest(eventStatus) {
      return eventStatus === "COMPLETE";
    },

    derivePayoutVector(_ranked, entryCount) {
      return defaultPayoutVector(entryCount);
    },
  };
}
