import type { SportModule } from "@cut/sport-sdk";
import { defaultPayoutVector } from "@cut/sport-sdk";
import { rankF1Entries } from "./ranking.js";
import {
  f1EventStatusFromMetadata,
  f1ShouldActivateContest,
  f1ShouldSettleContest,
  f1ShouldSyncLiveScores,
} from "./status.js";
import { F1_SPORT_ID } from "./metadata.js";

/** Server-provided async operations that touch Prisma and external F1 APIs. */
export type F1Handlers = {
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

export function createF1Module(handlers: F1Handlers): SportModule {
  return {
    id: F1_SPORT_ID,

    initEvent: handlers.initEvent,
    syncEventMetadata: handlers.syncEventMetadata,
    syncParticipantField: handlers.syncParticipantField,
    syncLiveScores: handlers.syncLiveScores,
    handleWithdrawals: handlers.handleWithdrawals,

    async shouldSyncLiveScores(eventId) {
      const metadata = await handlers.getEventMetadata(eventId);
      return f1ShouldSyncLiveScores(metadata);
    },

    async getEventStatus(eventId) {
      const metadata = await handlers.getEventMetadata(eventId);
      return f1EventStatusFromMetadata(metadata);
    },

    async getCandidatePool(eventId) {
      const { buildF1Candidates } = await import("./candidates.js");
      const rows = await handlers.getCandidateRows(eventId);
      return buildF1Candidates(rows);
    },

    validateRoster: handlers.validateRoster,

    async aggregateLineupScore(eventId, eventParticipantIds) {
      return handlers.getEventParticipantTotals(eventId, eventParticipantIds);
    },

    rankEntries: rankF1Entries,

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

export async function f1ShouldActivateFromMetadata(
  getMetadata: (eventId: string) => Promise<unknown | null>,
  eventId: string,
): Promise<boolean> {
  const metadata = await getMetadata(eventId);
  return f1ShouldActivateContest(metadata);
}

export async function f1ShouldSettleFromMetadata(
  getMetadata: (eventId: string) => Promise<unknown | null>,
  eventId: string,
): Promise<boolean> {
  const metadata = await getMetadata(eventId);
  return f1ShouldSettleContest(metadata);
}
