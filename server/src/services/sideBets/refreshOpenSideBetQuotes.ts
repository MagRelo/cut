import { prisma } from "../../lib/prisma.js";
import { SideBetMarketStatus } from "@prisma/client";
import { fetchSideBetDataGolfSnapshot } from "./fetchSideBetDataGolfSnapshot.js";
import { ingestSideBetQuoteForLineup } from "./ingestSideBetQuoteForLineup.js";
import { dataGolfTourFromEnv } from "../odds/dataGolfFieldUpdates.js";
import { sideBetsEnabled } from "./featureFlag.js";

/**
 * Minute cron: refresh side-bet quotes for the active tournament’s 4-player lineups
 * where the market is OPEN or UNAVAILABLE (retry). Skips LOCKED+.
 *
 * Fetches DataGolf field + outrights **once** per run and reuses for every lineup to avoid HTTP 429.
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
  const active = await prisma.tournament.findFirst({
    where: { manualActive: true },
    orderBy: { startDate: "desc" },
  });

  if (!active) {
    return { total: 0, succeeded: 0, failed: 0, tournaments: 0, lineupsAttempted: 0 };
  }

  const tour = dataGolfTourFromEnv();

  const lineups = await prisma.tournamentLineup.findMany({
    where: {
      tournamentId: active.id,
      players: { some: {} },
    },
    include: {
      players: true,
      sideBetMarket: true,
    },
  });

  const eligible = lineups.filter((lu) => {
    if (lu.players.length !== 4) return false;
    const st = lu.sideBetMarket?.status;
    if (
      st === SideBetMarketStatus.LOCKED ||
      st === SideBetMarketStatus.SETTLING ||
      st === SideBetMarketStatus.SETTLED ||
      st === SideBetMarketStatus.VOID ||
      st === SideBetMarketStatus.CLOSED
    ) {
      return false;
    }
    return true;
  });

  const lineupsAttempted = eligible.length;
  if (lineupsAttempted === 0) {
    return { total: 0, succeeded: 0, failed: 0, tournaments: 1, lineupsAttempted: 0 };
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
      tournaments: 1,
      lineupsAttempted,
    };
  }

  let succeeded = 0;
  let failed = 0;

  for (const lu of eligible) {
    const r = await ingestSideBetQuoteForLineup(lu.id, tour, snapshot);
    if (r.ok) succeeded++;
    else failed++;
  }

  return {
    total: lineupsAttempted,
    succeeded,
    failed,
    tournaments: 1,
    lineupsAttempted,
  };
}

/**
 * Recompute side-bet cells for one lineup right after the roster is saved.
 * Without this, GET /market keeps serving quotes for the previous four players until the cron job runs.
 */
export async function refreshSideBetQuoteForLineupAfterRosterChange(
  tournamentLineupId: string,
): Promise<void> {
  if (!sideBetsEnabled() || !process.env.DATAGOLF_API_KEY?.trim()) {
    return;
  }
  const tour = dataGolfTourFromEnv();
  try {
    const snapshot = await fetchSideBetDataGolfSnapshot(tour);
    await ingestSideBetQuoteForLineup(tournamentLineupId, tour, snapshot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[refreshSideBetQuoteForLineupAfterRosterChange]", tournamentLineupId, msg);
  }
}
