import { SideBetMarketStatus, type Prisma } from "@prisma/client";
import type { MarketSnapshot } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";

export type PropBetIngestResult =
  | { ok: true; marketId: string; quoteVersion: number }
  | { ok: false; reason: string };

type PersistableSelection = {
  hitsRequired: number;
  topN: number;
  decimalOdds: number;
  americanDisplay: string;
};

/** Duck-typed market metadata from any PropBetModule snapshot (opaque to platform). */
type PersistableMarketMetadata =
  | {
      kind: "open";
      tour?: string;
      dgEventId?: number;
      dgEventName?: string;
      dgFieldLastUpdated?: string;
      dgOddsLastUpdated?: string;
      selections: PersistableSelection[];
    }
  | {
      kind: "unavailable";
      reason: string;
      tour?: string;
    };

function asPersistableMetadata(metadata: unknown): PersistableMarketMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const record = metadata as Record<string, unknown>;
  if (record.kind === "unavailable" && typeof record.reason === "string") {
    return {
      kind: "unavailable",
      reason: record.reason,
      ...(typeof record.tour === "string" ? { tour: record.tour } : {}),
    };
  }
  if (record.kind !== "open" || !Array.isArray(record.selections)) {
    return null;
  }
  const selections: PersistableSelection[] = [];
  for (const raw of record.selections) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const s = raw as Record<string, unknown>;
    if (
      typeof s.hitsRequired !== "number" ||
      typeof s.topN !== "number" ||
      typeof s.decimalOdds !== "number" ||
      typeof s.americanDisplay !== "string"
    ) {
      return null;
    }
    selections.push({
      hitsRequired: s.hitsRequired,
      topN: s.topN,
      decimalOdds: s.decimalOdds,
      americanDisplay: s.americanDisplay,
    });
  }
  return {
    kind: "open",
    selections,
    ...(typeof record.tour === "string" ? { tour: record.tour } : {}),
    ...(typeof record.dgEventId === "number" ? { dgEventId: record.dgEventId } : {}),
    ...(typeof record.dgEventName === "string" ? { dgEventName: record.dgEventName } : {}),
    ...(typeof record.dgFieldLastUpdated === "string"
      ? { dgFieldLastUpdated: record.dgFieldLastUpdated }
      : {}),
    ...(typeof record.dgOddsLastUpdated === "string"
      ? { dgOddsLastUpdated: record.dgOddsLastUpdated }
      : {}),
  };
}

async function markUnavailable(
  tx: Prisma.TransactionClient,
  lineupId: string,
  eventId: string,
  reason: string,
  tour?: string,
): Promise<void> {
  const market = await tx.sideBetMarket.upsert({
    where: { lineupId },
    create: {
      lineupId,
      eventId,
      status: SideBetMarketStatus.UNAVAILABLE,
      unavailableReason: reason,
      quoteVersion: 0,
      ...(tour ? { datagolfTour: tour } : {}),
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
  if (!snapshot) {
    return { ok: false, reason: "NO_SNAPSHOT" };
  }

  const metadata = asPersistableMetadata(snapshot.metadata);
  if (!metadata) {
    await prisma.$transaction((tx) =>
      markUnavailable(tx, lineupId, eventId, "INVALID_SNAPSHOT_METADATA"),
    );
    return { ok: false, reason: "INVALID_SNAPSHOT_METADATA" };
  }

  if (metadata.kind === "unavailable") {
    await prisma.$transaction((tx) =>
      markUnavailable(tx, lineupId, eventId, metadata.reason, metadata.tour),
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
        ...(metadata.tour ? { datagolfTour: metadata.tour } : {}),
      },
      update: metadata.tour ? { datagolfTour: metadata.tour } : {},
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
        ...(metadata.dgEventId !== undefined ? { dgEventId: metadata.dgEventId } : {}),
        ...(metadata.dgEventName !== undefined ? { dgEventName: metadata.dgEventName } : {}),
        ...(metadata.dgFieldLastUpdated !== undefined
          ? { dgFieldLastUpdated: metadata.dgFieldLastUpdated }
          : {}),
        ...(metadata.dgOddsLastUpdated !== undefined
          ? { dgOddsLastUpdated: metadata.dgOddsLastUpdated }
          : {}),
        ...(metadata.tour ? { datagolfTour: metadata.tour } : {}),
      },
    });

    return { marketId: market.id, quoteVersion: nextVersion };
  });

  return { ok: true, marketId: result.marketId, quoteVersion: result.quoteVersion };
}
