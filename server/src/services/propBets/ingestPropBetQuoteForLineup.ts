import { SideBetMarketStatus } from "@prisma/client";
import type { PropBetIngestBatchContext } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { getPropBetModule, requirePropBetModule } from "../../sports/propBetRegistry.js";
import { persistPropBetMarketSnapshot, type PropBetIngestResult } from "./persistMarketSnapshot.js";

export type { PropBetIngestResult };

const SKIP_INGEST: SideBetMarketStatus[] = [
  SideBetMarketStatus.LOCKED,
  SideBetMarketStatus.SETTLING,
  SideBetMarketStatus.SETTLED,
  SideBetMarketStatus.VOID,
  SideBetMarketStatus.CLOSED,
];

export async function ingestPropBetQuoteForLineup(
  lineupId: string,
  batchContext?: PropBetIngestBatchContext,
): Promise<PropBetIngestResult> {
  const lineup = await prisma.lineup.findUnique({
    where: { id: lineupId },
    select: {
      id: true,
      eventId: true,
      event: { select: { sportId: true } },
      sideBetMarket: { select: { status: true } },
    },
  });

  if (!lineup) return { ok: false, reason: "LINEUP_NOT_FOUND" };

  if (lineup.sideBetMarket && SKIP_INGEST.includes(lineup.sideBetMarket.status)) {
    return { ok: false, reason: "MARKET_NOT_INGESTABLE_STATE" };
  }

  let propBetModule;
  try {
    propBetModule = requirePropBetModule(lineup.event.sportId);
  } catch {
    return { ok: false, reason: "PROP_BETS_NOT_SUPPORTED_FOR_SPORT" };
  }

  const marketSnapshot = await propBetModule.ingestQuotes(lineupId, batchContext);
  return persistPropBetMarketSnapshot(lineupId, lineup.eventId, marketSnapshot);
}

/** @deprecated Use ingestPropBetQuoteForLineup */
export const ingestSideBetQuoteForLineup = ingestPropBetQuoteForLineup;

export function sportSupportsPropBets(sportId: string): boolean {
  return getPropBetModule(sportId) !== undefined;
}
