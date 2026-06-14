import type {
  MarketSnapshot,
  PropBetGrade,
  PropBetModule,
  PropBetResultsShell,
  PropBetTicketShell,
} from "@cut/sport-sdk";
import { gradeGolfPropTicket, type GolfPropBetResultsMetadata, type GolfPropBetTicketMetadata } from "./prop-bet.js";
import { PGA_GOLF_SPORT_ID } from "./metadata.js";

export type PgaGolfPropBetHandlers = {
  buildMarketSnapshot(lineupId: string): Promise<MarketSnapshot | null>;
};

export function createPgaGolfPropBetModule(handlers: PgaGolfPropBetHandlers): PropBetModule {
  return {
    sportId: PGA_GOLF_SPORT_ID,

    ingestQuotes(lineupId: string): Promise<MarketSnapshot | null> {
      return handlers.buildMarketSnapshot(lineupId);
    },

    gradeTicket(ticket: PropBetTicketShell, results: PropBetResultsShell): PropBetGrade {
      const ticketMeta = ticket.metadata as GolfPropBetTicketMetadata;
      const resultsMeta = results.metadata as GolfPropBetResultsMetadata;
      return gradeGolfPropTicket(ticketMeta, resultsMeta);
    },
  };
}
