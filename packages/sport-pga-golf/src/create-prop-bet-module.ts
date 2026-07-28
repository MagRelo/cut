import type {
  MarketSnapshot,
  PropBetGrade,
  PropBetIngestBatchContext,
  PropBetModule,
  PropBetResultsShell,
  PropBetTicketShell,
} from "@cut/sport-sdk";
import {
  gradeGolfPropTicket,
  isGolfFinishInTopN,
  type GolfPropBetResultsMetadata,
  type GolfPropBetTicketMetadata,
} from "./prop-bet.js";
import { PGA_GOLF_SPORT_ID, parseGolfEventMetadata } from "./metadata.js";
import { isGolfEventCompleteRaw } from "./status.js";

export type PgaGolfPropBetHandlers = {
  beginIngestBatch?(): Promise<PropBetIngestBatchContext | undefined>;
  buildMarketSnapshot(
    lineupId: string,
    batchContext?: PropBetIngestBatchContext,
  ): Promise<MarketSnapshot | null>;
};

export function createPgaGolfPropBetModule(handlers: PgaGolfPropBetHandlers): PropBetModule {
  return {
    sportId: PGA_GOLF_SPORT_ID,

    beginIngestBatch: handlers.beginIngestBatch,

    ingestQuotes(
      lineupId: string,
      batchContext?: PropBetIngestBatchContext,
    ): Promise<MarketSnapshot | null> {
      return handlers.buildMarketSnapshot(lineupId, batchContext);
    },

    gradeTicket(ticket: PropBetTicketShell, results: PropBetResultsShell): PropBetGrade {
      const ticketMeta = ticket.metadata as GolfPropBetTicketMetadata;
      const resultsMeta = results.metadata as GolfPropBetResultsMetadata;
      return gradeGolfPropTicket(ticketMeta, resultsMeta);
    },

    describeGrade(ticket: PropBetTicketShell, results: PropBetResultsShell) {
      const ticketMeta = ticket.metadata as GolfPropBetTicketMetadata;
      const resultsMeta = results.metadata as GolfPropBetResultsMetadata;
      if (
        !ticketMeta?.eventParticipantIds ||
        ticketMeta.eventParticipantIds.length !== 4 ||
        !resultsMeta?.leaderboardPositions ||
        resultsMeta.leaderboardPositions.length !== 4
      ) {
        return null;
      }
      const hits = resultsMeta.leaderboardPositions.filter(
        (position) => isGolfFinishInTopN(position, ticketMeta.topN) === true,
      ).length;
      return {
        hits,
        hitsRequired: ticketMeta.hitsRequired,
        topN: ticketMeta.topN,
      };
    },

    isEventCompleteForSettlement(metadata: unknown): boolean {
      const golf = parseGolfEventMetadata(metadata);
      if (!golf) return false;
      return isGolfEventCompleteRaw(golf.status);
    },
  };
}
