import type {
  Candidate,
  EventStatus,
  LineupEntryInput,
  PayoutVector,
  RankedEntry,
  RosterRules,
  ValidationResult,
} from "./types.js";

export interface SportModule {
  readonly id: string;

  initEvent(externalId: string): Promise<void>;
  syncEventMetadata(eventId: string): Promise<void>;
  syncParticipantField(eventId: string): Promise<void>;
  syncLiveScores(eventId: string): Promise<void>;
  shouldSyncLiveScores(eventId: string): Promise<boolean>;
  getEventStatus(eventId: string): Promise<EventStatus>;

  getCandidatePool(eventId: string): Promise<Candidate[]>;
  validateRoster(
    eventId: string,
    picks: string[],
    rules: RosterRules,
  ): Promise<ValidationResult>;
  handleWithdrawals?(eventId: string): Promise<void>;

  aggregateLineupScore(
    eventId: string,
    eventParticipantIds: string[],
  ): Promise<number>;
  rankEntries(entries: LineupEntryInput[]): RankedEntry[];

  shouldActivateContest(eventStatus: EventStatus | string): boolean;
  shouldSettleContest(eventStatus: EventStatus | string): boolean;
  derivePayoutVector?(
    ranked: RankedEntry[],
    entryCount: number,
  ): PayoutVector;
}
