import type { MarketSnapshot } from "@cut/sport-sdk";
import type { GolfPropBetMarketMetadata, GolfPropBetSelection } from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";
import { calculateRoundRobinOdds, type PlayerFinishDecimals } from "../../services/odds/calculateRoundRobinOdds.js";
import {
  buildPgaTourIdToDgIdMap,
  fetchDataGolfFieldUpdates,
  type DataGolfTourParam,
} from "../../services/odds/dataGolfFieldUpdates.js";
import {
  fetchDataGolfOutrights,
  oddsRowsByDgId,
  pickIngestDecimal,
} from "../../services/odds/dataGolfOutrightsClient.js";
import { eventsAlign } from "../../services/sideBets/eventAlignment.js";
import type { SideBetDataGolfSnapshot } from "../../services/sideBets/fetchSideBetDataGolfSnapshot.js";
import { eventDisplayName, participantPgaTourId } from "../../services/sideBets/lineupSideBetUtils.js";
import { getSharedGolfPropBetSnapshot } from "./propBetSnapshotContext.js";

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

function unavailableSnapshot(
  lineupId: string,
  tour: DataGolfTourParam,
  reason: string,
): MarketSnapshot {
  const metadata: GolfPropBetMarketMetadata = {
    kind: "unavailable",
    reason,
    tour,
  };
  return { lineupId, capturedAt: new Date(), metadata };
}

export async function buildGolfMarketSnapshot(
  lineupId: string,
  tour: DataGolfTourParam = "pga",
  snapshotOverride?: SideBetDataGolfSnapshot,
): Promise<MarketSnapshot | null> {
  const lineup = await prisma.lineup.findUnique({
    where: { id: lineupId },
    include: {
      event: true,
      picks: {
        include: { eventParticipant: { include: { participant: true } } },
        orderBy: { slotIndex: "asc" },
      },
    },
  });

  if (!lineup) return null;
  if (lineup.picks.length !== 4) {
    return unavailableSnapshot(lineupId, tour, "LINEUP_NOT_FOUR_PLAYERS");
  }

  const eventName = eventDisplayName(lineup.event);
  const sharedSnapshot = snapshotOverride ?? getSharedGolfPropBetSnapshot();

  try {
    const field = sharedSnapshot?.field ?? (await fetchDataGolfFieldUpdates(tour));
    if (!eventsAlign(eventName, field.event_name)) {
      return unavailableSnapshot(lineupId, tour, "EVENT_NAME_MISMATCH");
    }

    const pgaToDg = buildPgaTourIdToDgIdMap(field.field);

    const outrightsTop5 = sharedSnapshot?.outrightsTop5 ?? (await fetchDataGolfOutrights(tour, "top_5"));
    const outrightsTop10 = sharedSnapshot?.outrightsTop10 ?? (await fetchDataGolfOutrights(tour, "top_10"));
    const outrightsTop20 = sharedSnapshot?.outrightsTop20 ?? (await fetchDataGolfOutrights(tour, "top_20"));

    const namesOk =
      eventsAlign(eventName, outrightsTop5.event_name) &&
      eventsAlign(eventName, outrightsTop10.event_name) &&
      eventsAlign(eventName, outrightsTop20.event_name);

    if (!namesOk) {
      return unavailableSnapshot(lineupId, tour, "OUTRIGHTS_EVENT_MISMATCH");
    }

    const map5 = oddsRowsByDgId(outrightsTop5.odds);
    const map10 = oddsRowsByDgId(outrightsTop10.odds);
    const map20 = oddsRowsByDgId(outrightsTop20.odds);

    const sortedPicks = [...lineup.picks].sort((a, b) =>
      a.eventParticipantId.localeCompare(b.eventParticipantId),
    );
    const playerDecimals: PlayerFinishDecimals[] = [];

    for (const pick of sortedPicks) {
      const pgaTourId = participantPgaTourId(pick.eventParticipant.participant);
      if (!pgaTourId) {
        return unavailableSnapshot(lineupId, tour, "MISSING_PGA_TOUR_ID");
      }
      const dgId = pgaToDg.get(pgaTourId);
      if (dgId == null) {
        return unavailableSnapshot(lineupId, tour, "PLAYER_NOT_IN_FIELD");
      }
      const row5 = map5.get(dgId);
      const row10 = map10.get(dgId);
      const row20 = map20.get(dgId);
      if (!row5 || !row10 || !row20) {
        return unavailableSnapshot(lineupId, tour, "MISSING_OUTRIGHTS_ROW");
      }
      const decimal5 = pickIngestDecimal(row5);
      const decimal10 = pickIngestDecimal(row10);
      const decimal20 = pickIngestDecimal(row20);
      if (decimal5 == null || decimal10 == null || decimal20 == null) {
        return unavailableSnapshot(lineupId, tour, "MISSING_FINISH_DECIMAL");
      }
      playerDecimals.push({ top5: decimal5, top10: decimal10, top20: decimal20 });
    }

    const tuple = playerDecimals as [
      PlayerFinishDecimals,
      PlayerFinishDecimals,
      PlayerFinishDecimals,
      PlayerFinishDecimals,
    ];
    const cells = calculateRoundRobinOdds(tuple);
    const selections: GolfPropBetSelection[] = cells.map((cell) => ({
      hitsRequired: rowLabelToHits(cell.row),
      topN: colLabelToTopN(cell.col),
      decimalOdds: cell.decimal,
      americanDisplay: cell.american,
    }));

    const metadata: GolfPropBetMarketMetadata = {
      kind: "open",
      tour,
      dgEventId: field.event_id,
      dgEventName: field.event_name,
      dgFieldLastUpdated: field.last_updated,
      dgOddsLastUpdated: outrightsTop10.last_updated,
      selections,
    };

    return { lineupId, capturedAt: new Date(), metadata };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[buildGolfMarketSnapshot]", lineupId, message);
    return unavailableSnapshot(lineupId, tour, `INGEST_ERROR:${message.slice(0, 200)}`);
  }
}
