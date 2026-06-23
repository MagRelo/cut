import type {
  MarketSnapshot,
  PropBetGrade,
  PropBetResultsShell,
  PropBetTicketShell,
} from "./types.js";

export interface PropBetModule {
  readonly sportId: string;

  ingestQuotes(lineupId: string): Promise<MarketSnapshot | null>;
  gradeTicket(
    ticket: PropBetTicketShell,
    results: PropBetResultsShell,
  ): PropBetGrade;
}
