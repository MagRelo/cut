import { SideBetMarketStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { calculateRoundRobinOdds, type PlayerFinishDecimals } from "../odds/calculateRoundRobinOdds.js";
import {
  buildPgaTourIdToDgIdMap,
  fetchDataGolfFieldUpdates,
  type DataGolfTourParam,
} from "../odds/dataGolfFieldUpdates.js";
import {
  fetchDataGolfOutrights,
  oddsRowsByDgId,
  pickDraftKingsDecimal,
} from "../odds/dataGolfOutrightsClient.js";
import { eventsAlign } from "./eventAlignment.js";
import type { SideBetDataGolfSnapshot } from "./fetchSideBetDataGolfSnapshot.js";

export type IngestResult =
  | { ok: true; marketId: string; quoteVersion: number }
  | { ok: false; reason: string };

const SKIP_INGEST: SideBetMarketStatus[] = [
  SideBetMarketStatus.LOCKED,
  SideBetMarketStatus.SETTLING,
  SideBetMarketStatus.SETTLED,
  SideBetMarketStatus.VOID,
  SideBetMarketStatus.CLOSED,
];

function rowLabelToHits(row: string): number {
  if (row === "2 of 4") return 2;
  if (row === "3 of 4") return 3;
  return 4;
}

function colLabelToTopN(col: string): number {
  if (col === "Top 5") return 5;
  if (col === "Top 10") return 10;
  return 20;
}

async function markUnavailable(
  tx: Prisma.TransactionClient,
  tournamentLineupId: string,
  tournamentId: string,
  tour: DataGolfTourParam,
  reason: string,
): Promise<void> {
  const market = await tx.sideBetMarket.upsert({
    where: { tournamentLineupId },
    create: {
      tournamentLineupId,
      tournamentId,
      status: SideBetMarketStatus.UNAVAILABLE,
      unavailableReason: reason,
      quoteVersion: 0,
      datagolfTour: tour,
    },
    update: {
      status: SideBetMarketStatus.UNAVAILABLE,
      unavailableReason: reason,
    },
  });
  await tx.sideBetSelection.deleteMany({ where: { sideBetMarketId: market.id } });
}

export async function ingestSideBetQuoteForLineup(
  tournamentLineupId: string,
  tour: DataGolfTourParam = "pga",
  snapshot?: SideBetDataGolfSnapshot,
): Promise<IngestResult> {
  const lineup = await prisma.tournamentLineup.findUnique({
    where: { id: tournamentLineupId },
    include: {
      tournament: true,
      players: { include: { tournamentPlayer: { include: { player: true } } } },
      sideBetMarket: true,
    },
  });

  if (!lineup) return { ok: false, reason: "LINEUP_NOT_FOUND" };

  if (lineup.sideBetMarket && SKIP_INGEST.includes(lineup.sideBetMarket.status)) {
    return { ok: false, reason: "MARKET_NOT_INGESTABLE_STATE" };
  }

  if (lineup.players.length !== 4) {
    await prisma.$transaction((tx) =>
      markUnavailable(tx, lineup.id, lineup.tournamentId, tour, "LINEUP_NOT_FOUR_PLAYERS"),
    );
    return { ok: false, reason: "LINEUP_NOT_FOUR_PLAYERS" };
  }

  try {
    const field = snapshot?.field ?? (await fetchDataGolfFieldUpdates(tour));
    if (!eventsAlign(lineup.tournament.name, field.event_name)) {
      await prisma.$transaction((tx) =>
        markUnavailable(tx, lineup.id, lineup.tournamentId, tour, "EVENT_NAME_MISMATCH"),
      );
      return { ok: false, reason: "EVENT_NAME_MISMATCH" };
    }

    const pgaToDg = buildPgaTourIdToDgIdMap(field.field);

    const outrightsTop5 = snapshot?.outrightsTop5 ?? (await fetchDataGolfOutrights(tour, "top_5"));
    const outrightsTop10 = snapshot?.outrightsTop10 ?? (await fetchDataGolfOutrights(tour, "top_10"));
    const outrightsTop20 = snapshot?.outrightsTop20 ?? (await fetchDataGolfOutrights(tour, "top_20"));

    const namesOk =
      eventsAlign(lineup.tournament.name, outrightsTop5.event_name) &&
      eventsAlign(lineup.tournament.name, outrightsTop10.event_name) &&
      eventsAlign(lineup.tournament.name, outrightsTop20.event_name);

    if (!namesOk) {
      await prisma.$transaction((tx) =>
        markUnavailable(tx, lineup.id, lineup.tournamentId, tour, "OUTRIGHTS_EVENT_MISMATCH"),
      );
      return { ok: false, reason: "OUTRIGHTS_EVENT_MISMATCH" };
    }

    const map5 = oddsRowsByDgId(outrightsTop5.odds);
    const map10 = oddsRowsByDgId(outrightsTop10.odds);
    const map20 = oddsRowsByDgId(outrightsTop20.odds);

    const sortedPlayers = [...lineup.players].sort((a, b) => a.id.localeCompare(b.id));
    const playerDecimals: PlayerFinishDecimals[] = [];

    for (const lp of sortedPlayers) {
      const pgaTourId = lp.tournamentPlayer.player.pga_pgaTourId;
      if (!pgaTourId) {
        await prisma.$transaction((tx) =>
          markUnavailable(tx, lineup.id, lineup.tournamentId, tour, "MISSING_PGA_TOUR_ID"),
        );
        return { ok: false, reason: "MISSING_PGA_TOUR_ID" };
      }
      const dgId = pgaToDg.get(pgaTourId);
      if (dgId == null) {
        await prisma.$transaction((tx) =>
          markUnavailable(tx, lineup.id, lineup.tournamentId, tour, "PLAYER_NOT_IN_FIELD"),
        );
        return { ok: false, reason: "PLAYER_NOT_IN_FIELD" };
      }
      const r5 = map5.get(dgId);
      const r10 = map10.get(dgId);
      const r20 = map20.get(dgId);
      if (!r5 || !r10 || !r20) {
        await prisma.$transaction((tx) =>
          markUnavailable(tx, lineup.id, lineup.tournamentId, tour, "MISSING_OUTRIGHTS_ROW"),
        );
        return { ok: false, reason: "MISSING_OUTRIGHTS_ROW" };
      }
      const d5 = pickDraftKingsDecimal(r5);
      const d10 = pickDraftKingsDecimal(r10);
      const d20 = pickDraftKingsDecimal(r20);
      if (d5 == null || d10 == null || d20 == null) {
        await prisma.$transaction((tx) =>
          markUnavailable(tx, lineup.id, lineup.tournamentId, tour, "MISSING_DRAFTKINGS_DECIMAL"),
        );
        return { ok: false, reason: "MISSING_DRAFTKINGS_DECIMAL" };
      }
      playerDecimals.push({ top5: d5, top10: d10, top20: d20 });
    }

    const tuple = playerDecimals as [
      PlayerFinishDecimals,
      PlayerFinishDecimals,
      PlayerFinishDecimals,
      PlayerFinishDecimals,
    ];
    const cells = calculateRoundRobinOdds(tuple);

    const result = await prisma.$transaction(async (tx) => {
      const market = await tx.sideBetMarket.upsert({
        where: { tournamentLineupId: lineup.id },
        create: {
          tournamentLineupId: lineup.id,
          tournamentId: lineup.tournamentId,
          status: SideBetMarketStatus.UNAVAILABLE,
          quoteVersion: 0,
          datagolfTour: tour,
        },
        update: { datagolfTour: tour },
      });

      const nextVersion = market.quoteVersion + 1;

      await tx.sideBetSelection.deleteMany({ where: { sideBetMarketId: market.id } });

      await tx.sideBetSelection.createMany({
        data: cells.map((c) => ({
          sideBetMarketId: market.id,
          hitsRequired: rowLabelToHits(c.row),
          topN: colLabelToTopN(c.col),
          decimalOdds: c.decimal,
          americanDisplay: c.american,
          quoteVersion: nextVersion,
        })),
      });

      await tx.sideBetMarket.update({
        where: { id: market.id },
        data: {
          status: SideBetMarketStatus.OPEN,
          unavailableReason: null,
          quoteVersion: nextVersion,
          dgEventId: field.event_id,
          dgEventName: field.event_name,
          dgFieldLastUpdated: field.last_updated,
          dgOddsLastUpdated: outrightsTop10.last_updated,
          datagolfTour: tour,
        },
      });

      return { marketId: market.id, quoteVersion: nextVersion };
    });

    return { ok: true, marketId: result.marketId, quoteVersion: result.quoteVersion };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ingestSideBetQuoteForLineup]", tournamentLineupId, msg);
    await prisma.$transaction((tx) =>
      markUnavailable(tx, lineup.id, lineup.tournamentId, tour, `INGEST_ERROR:${msg.slice(0, 200)}`),
    );
    return { ok: false, reason: "INGEST_ERROR" };
  }
}
