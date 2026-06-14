import { SideBetMarketStatus, type Prisma } from "@prisma/client";
import type { MarketSnapshot } from "@cut/sport-sdk";
import type { GolfPropBetMarketMetadata } from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";
import { dataGolfTourFromEnv } from "../odds/dataGolfFieldUpdates.js";

export type PropBetIngestResult =
  | { ok: true; marketId: string; quoteVersion: number }
  | { ok: false; reason: string };

async function markUnavailable(
  tx: Prisma.TransactionClient,
  lineupId: string,
  eventId: string,
  tour: string,
  reason: string,
): Promise<void> {
  const market = await tx.sideBetMarket.upsert({
    where: { lineupId },
    create: {
      lineupId,
      eventId,
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

export async function persistPropBetMarketSnapshot(
  lineupId: string,
  eventId: string,
  snapshot: MarketSnapshot | null,
): Promise<PropBetIngestResult> {
  const tour = dataGolfTourFromEnv();

  if (!snapshot) {
    return { ok: false, reason: "NO_SNAPSHOT" };
  }

  const metadata = snapshot.metadata as GolfPropBetMarketMetadata;
  if (!metadata || typeof metadata !== "object" || !("kind" in metadata)) {
    await prisma.$transaction((tx) =>
      markUnavailable(tx, lineupId, eventId, tour, "INVALID_SNAPSHOT_METADATA"),
    );
    return { ok: false, reason: "INVALID_SNAPSHOT_METADATA" };
  }

  if (metadata.kind === "unavailable") {
    await prisma.$transaction((tx) =>
      markUnavailable(tx, lineupId, eventId, metadata.tour, metadata.reason),
    );
    return { ok: false, reason: metadata.reason };
  }

  const result = await prisma.$transaction(async (tx) => {
    const market = await tx.sideBetMarket.upsert({
      where: { lineupId },
      create: {
        lineupId,
        eventId,
        status: SideBetMarketStatus.UNAVAILABLE,
        quoteVersion: 0,
        datagolfTour: metadata.tour,
      },
      update: { datagolfTour: metadata.tour },
    });

    const nextVersion = market.quoteVersion + 1;

    await tx.sideBetSelection.deleteMany({ where: { sideBetMarketId: market.id } });
    await tx.sideBetSelection.createMany({
      data: metadata.selections.map((selection) => ({
        sideBetMarketId: market.id,
        hitsRequired: selection.hitsRequired,
        topN: selection.topN,
        decimalOdds: selection.decimalOdds,
        americanDisplay: selection.americanDisplay,
        quoteVersion: nextVersion,
      })),
    });

    await tx.sideBetMarket.update({
      where: { id: market.id },
      data: {
        status: SideBetMarketStatus.OPEN,
        unavailableReason: null,
        quoteVersion: nextVersion,
        dgEventId: metadata.dgEventId,
        dgEventName: metadata.dgEventName,
        dgFieldLastUpdated: metadata.dgFieldLastUpdated,
        dgOddsLastUpdated: metadata.dgOddsLastUpdated,
        datagolfTour: metadata.tour,
      },
    });

    return { marketId: market.id, quoteVersion: nextVersion };
  });

  return { ok: true, marketId: result.marketId, quoteVersion: result.quoteVersion };
}
