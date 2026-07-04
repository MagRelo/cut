import { prisma } from "../../lib/prisma.js";
import { SideBetMarketStatus } from "@prisma/client";
import { fetchSideBetDataGolfSnapshot } from "./fetchSideBetDataGolfSnapshot.js";
import { ingestPropBetQuoteForLineup } from "../propBets/ingestPropBetQuoteForLineup.js";
import { dataGolfTourFromEnv } from "../odds/dataGolfFieldUpdates.js";
import { sideBetsEnabled } from "./featureFlag.js";
import { getActiveEvents } from "../events/getActiveEvents.js";
import {
  isPropBetIngestFailure,
  isPropBetUnavailableDataReason,
} from "./propBetIngestReasons.js";

/**
 * Minute cron: refresh side-bet quotes for 4-player lineups on active events
 * where the market is OPEN or UNAVAILABLE (retry). Skips LOCKED+.
 */
export async function refreshOpenSideBetQuotes(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  tournaments: number;
  lineupsAttempted: number;
}> {
  if (!sideBetsEnabled()) {
    return { total: 0, succeeded: 0, failed: 0, tournaments: 0, lineupsAttempted: 0 };
  }
  if (!process.env.DATAGOLF_API_KEY?.trim()) {
    console.warn("[refreshOpenSideBetQuotes] DATAGOLF_API_KEY not set; skipping");
    return { total: 0, succeeded: 0, failed: 0, tournaments: 0, lineupsAttempted: 0 };
  }

  const activeEvents = await getActiveEvents();
  if (activeEvents.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, tournaments: 0, lineupsAttempted: 0 };
  }

  const tour = dataGolfTourFromEnv();
  const eventIds = activeEvents.map((event) => event.id);

  const lineups = await prisma.lineup.findMany({
    where: {
      eventId: { in: eventIds },
      picks: { some: {} },
    },
    include: {
      picks: true,
      sideBetMarket: true,
    },
  });

  const eligible = lineups.filter((lineup) => {
    if (lineup.picks.length !== 4) return false;
    const status = lineup.sideBetMarket?.status;
    if (
      status === SideBetMarketStatus.LOCKED ||
      status === SideBetMarketStatus.SETTLING ||
      status === SideBetMarketStatus.SETTLED ||
      status === SideBetMarketStatus.VOID ||
      status === SideBetMarketStatus.CLOSED
    ) {
      return false;
    }
    return true;
  });

  const lineupsAttempted = eligible.length;
  if (lineupsAttempted === 0) {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      tournaments: activeEvents.length,
      lineupsAttempted: 0,
    };
  }

  let snapshot;
  try {
    snapshot = await fetchSideBetDataGolfSnapshot(tour);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[refreshOpenSideBetQuotes] DataGolf snapshot failed:", msg);
    return {
      total: lineupsAttempted,
      succeeded: 0,
      failed: lineupsAttempted,
      tournaments: activeEvents.length,
      lineupsAttempted,
    };
  }

  let succeeded = 0;
  let failed = 0;
  let unavailable = 0;

  for (const lineup of eligible) {
    const result = await ingestPropBetQuoteForLineup(lineup.id, tour, snapshot);
    if (result.ok) {
      succeeded++;
      continue;
    }

    if (isPropBetUnavailableDataReason(result.reason)) {
      unavailable++;
      console.log(
        `[refreshOpenSideBetQuotes] lineup ${lineup.id} unavailable: ${result.reason}`,
      );
      continue;
    }

    if (isPropBetIngestFailure(result.reason)) {
      failed++;
      console.error(
        `[refreshOpenSideBetQuotes] lineup ${lineup.id} failed: ${result.reason}`,
      );
    }
  }

  if (unavailable > 0) {
    console.log(
      `[refreshOpenSideBetQuotes] ${unavailable} lineup(s) unavailable (data gap, not counted as failure)`,
    );
  }

  return {
    total: lineupsAttempted,
    succeeded,
    failed,
    tournaments: activeEvents.length,
    lineupsAttempted,
  };
}

/** Recompute side-bet cells for one lineup right after the roster is saved. */
export async function refreshSideBetQuoteForLineupAfterRosterChange(
  lineupId: string,
): Promise<void> {
  if (!sideBetsEnabled() || !process.env.DATAGOLF_API_KEY?.trim()) {
    return;
  }
  const tour = dataGolfTourFromEnv();
  try {
    const snapshot = await fetchSideBetDataGolfSnapshot(tour);
    await ingestPropBetQuoteForLineup(lineupId, tour, snapshot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[refreshSideBetQuoteForLineupAfterRosterChange]", lineupId, msg);
  }
}
