import { prisma } from "../../lib/prisma.js";
import { SideBetMarketStatus } from "@prisma/client";
import { ingestPropBetQuoteForLineup } from "../propBets/ingestPropBetQuoteForLineup.js";
import { sideBetsEnabled } from "./featureFlag.js";
import { getActiveEvents } from "../events/getActiveEvents.js";
import {
  isPropBetIngestFailure,
  isPropBetUnavailableDataReason,
} from "./propBetIngestReasons.js";
import { listPropBetModules } from "../../sports/propBetRegistry.js";

/**
 * Minute cron: refresh side-bet quotes for eligible lineups on active events
 * where the market is OPEN or UNAVAILABLE (retry). Skips LOCKED+.
 * Delegates provider fetch to each registered PropBetModule.beginIngestBatch.
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

  const modules = listPropBetModules();
  if (modules.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, tournaments: 0, lineupsAttempted: 0 };
  }

  const activeEvents = await getActiveEvents();
  if (activeEvents.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, tournaments: 0, lineupsAttempted: 0 };
  }

  const sportIdsWithPropBets = new Set(modules.map((m) => m.sportId));
  const eventsWithPropBets = activeEvents.filter((event) => sportIdsWithPropBets.has(event.sportId));
  if (eventsWithPropBets.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, tournaments: 0, lineupsAttempted: 0 };
  }

  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalAttempted = 0;

  for (const module of modules) {
    const sportEventIds = eventsWithPropBets
      .filter((event) => event.sportId === module.sportId)
      .map((event) => event.id);
    if (sportEventIds.length === 0) continue;

    const lineups = await prisma.lineup.findMany({
      where: {
        eventId: { in: sportEventIds },
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

    if (eligible.length === 0) continue;

    let batchContext: unknown | undefined;
    if (module.beginIngestBatch) {
      batchContext = await module.beginIngestBatch();
      if (batchContext === undefined) {
        totalFailed += eligible.length;
        totalAttempted += eligible.length;
        continue;
      }
    }

    totalAttempted += eligible.length;
    let unavailable = 0;

    for (const lineup of eligible) {
      const result = await ingestPropBetQuoteForLineup(lineup.id, batchContext);
      if (result.ok) {
        totalSucceeded++;
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
        totalFailed++;
        console.error(
          `[refreshOpenSideBetQuotes] lineup ${lineup.id} failed: ${result.reason}`,
        );
      }
    }

    if (unavailable > 0) {
      console.log(
        `[refreshOpenSideBetQuotes] ${module.sportId}: ${unavailable} lineup(s) unavailable (data gap, not counted as failure)`,
      );
    }
  }

  return {
    total: totalAttempted,
    succeeded: totalSucceeded,
    failed: totalFailed,
    tournaments: eventsWithPropBets.length,
    lineupsAttempted: totalAttempted,
  };
}

/** Recompute side-bet cells for one lineup right after the roster is saved. */
export async function refreshSideBetQuoteForLineupAfterRosterChange(
  lineupId: string,
): Promise<void> {
  if (!sideBetsEnabled()) {
    return;
  }
  try {
    const lineup = await prisma.lineup.findUnique({
      where: { id: lineupId },
      select: { event: { select: { sportId: true } } },
    });
    if (!lineup) return;
    const module = listPropBetModules().find((m) => m.sportId === lineup.event.sportId);
    if (!module) return;

    let batchContext: unknown | undefined;
    if (module.beginIngestBatch) {
      batchContext = await module.beginIngestBatch();
      if (batchContext === undefined) return;
    }
    await ingestPropBetQuoteForLineup(lineupId, batchContext);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[refreshSideBetQuoteForLineupAfterRosterChange]", lineupId, msg);
  }
}
