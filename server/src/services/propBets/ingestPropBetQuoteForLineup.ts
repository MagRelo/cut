import { SideBetMarketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { requirePropBetModule } from "../../sports/propBetRegistry.js";
import { runWithGolfPropBetSnapshot } from "../../sports/pga-golf/propBetSnapshotContext.js";
import type { SideBetDataGolfSnapshot } from "../sideBets/fetchSideBetDataGolfSnapshot.js";
import type { DataGolfTourParam } from "../odds/dataGolfFieldUpdates.js";
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
  _tour?: DataGolfTourParam,
  snapshot?: SideBetDataGolfSnapshot,
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

  const propBetModule = getPropBetModuleSafe(lineup.event.sportId);
  if (!propBetModule) {
    return { ok: false, reason: "PROP_BETS_NOT_SUPPORTED_FOR_SPORT" };
  }

  return runWithGolfPropBetSnapshot(snapshot, async () => {
    const marketSnapshot = await propBetModule.ingestQuotes(lineupId);
    return persistPropBetMarketSnapshot(lineupId, lineup.eventId, marketSnapshot);
  });
}

function getPropBetModuleSafe(sportId: string) {
  try {
    return requirePropBetModule(sportId);
  } catch {
    return undefined;
  }
}

/** @deprecated Use ingestPropBetQuoteForLineup */
export const ingestSideBetQuoteForLineup = ingestPropBetQuoteForLineup;
