import type {
  MarketSnapshot,
  PropBetGrade,
  PropBetResultsShell,
  PropBetTicketShell,
} from "./types.js";

/** Opaque batch context from `beginIngestBatch` (e.g. shared odds snapshot). */
export type PropBetIngestBatchContext = unknown;

export interface PropBetModule {
  readonly sportId: string;

  /**
   * Optional: one provider fetch per cron pass. Return undefined to skip the sport
   * (e.g. missing API key). Platform passes the result into each `ingestQuotes`.
   */
  beginIngestBatch?(): Promise<PropBetIngestBatchContext | undefined>;

  ingestQuotes(
    lineupId: string,
    batchContext?: PropBetIngestBatchContext,
  ): Promise<MarketSnapshot | null>;

  gradeTicket(
    ticket: PropBetTicketShell,
    results: PropBetResultsShell,
  ): PropBetGrade;

  /**
   * Optional settlement notes (hits, etc.) without platform knowing sport rules.
   */
  describeGrade?(
    ticket: PropBetTicketShell,
    results: PropBetResultsShell,
  ): Record<string, unknown> | null;

  /** Optional: whether the event is complete enough to settle prop tickets. */
  isEventCompleteForSettlement?(metadata: unknown): boolean;
}
