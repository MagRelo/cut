import type { SportModule } from "@cut/sport-sdk";
import { defaultPayoutVector } from "@cut/sport-sdk";
import { rankGolfEntries } from "./ranking.js";
import {
  golfEventStatusFromMetadata,
  golfShouldActivateContest,
  golfShouldSettleContest,
} from "./status.js";
import { PGA_GOLF_SPORT_ID } from "./metadata.js";

/** Server-provided async operations that touch Prisma and external PGA APIs. */
export type PgaGolfHandlers = {
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
  handleWithdrawals?(eventId: string): Promise<void>;
};

export function createPgaGolfModule(handlers: PgaGolfHandlers): SportModule {
  return {
    id: PGA_GOLF_SPORT_ID,

    initEvent: handlers.initEvent,
    syncEventMetadata: handlers.syncEventMetadata,
    syncParticipantField: handlers.syncParticipantField,
    syncLiveScores: handlers.syncLiveScores,
    handleWithdrawals: handlers.handleWithdrawals,

    async getEventStatus(eventId) {
      const metadata = await handlers.getEventMetadata(eventId);
      return golfEventStatusFromMetadata(metadata);
    },

    async getCandidatePool(eventId) {
      const { buildGolfCandidates } = await import("./candidates.js");
      const rows = await handlers.getCandidateRows(eventId);
      return buildGolfCandidates(rows);
    },

    validateRoster: handlers.validateRoster,

    async aggregateLineupScore(eventId, eventParticipantIds) {
      return handlers.getEventParticipantTotals(eventId, eventParticipantIds);
    },

    rankEntries: rankGolfEntries,

    shouldActivateContest(eventStatus) {
      if (eventStatus === "LIVE") {
        return true;
      }
      return false;
    },

    shouldSettleContest(eventStatus) {
      return eventStatus === "COMPLETE";
    },

    derivePayoutVector(_ranked, entryCount) {
      return defaultPayoutVector(entryCount);
    },
  };
}

export async function golfShouldActivateFromMetadata(
  getMetadata: (eventId: string) => Promise<unknown | null>,
  eventId: string,
): Promise<boolean> {
  const metadata = await getMetadata(eventId);
  return golfShouldActivateContest(metadata);
}

export async function golfShouldSettleFromMetadata(
  getMetadata: (eventId: string) => Promise<unknown | null>,
  eventId: string,
): Promise<boolean> {
  const metadata = await getMetadata(eventId);
  return golfShouldSettleContest(metadata);
}
