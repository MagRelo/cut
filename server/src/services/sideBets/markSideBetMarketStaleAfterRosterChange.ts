import { SideBetMarketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { dataGolfTourFromEnv } from "../odds/dataGolfFieldUpdates.js";
import { sideBetsEnabled } from "./featureFlag.js";

const SKIP_MARK_STALE: SideBetMarketStatus[] = [
  SideBetMarketStatus.LOCKED,
  SideBetMarketStatus.SETTLING,
  SideBetMarketStatus.SETTLED,
  SideBetMarketStatus.VOID,
  SideBetMarketStatus.CLOSED,
];

/**
 * Marks side-bet quotes stale after a roster save (no DataGolf call).
 * Cron `refreshOpenSideBetQuotes` will repopulate OPEN markets.
 */
export async function markSideBetMarketStaleAfterRosterChange(
  tournamentLineupId: string,
): Promise<void> {
  if (!sideBetsEnabled()) {
    return;
  }

  const lineup = await prisma.tournamentLineup.findUnique({
    where: { id: tournamentLineupId },
    select: {
      tournamentId: true,
      sideBetMarket: { select: { status: true } },
    },
  });

  if (!lineup) {
    return;
  }

  const status = lineup.sideBetMarket?.status;
  if (status && SKIP_MARK_STALE.includes(status)) {
    return;
  }

  const tour = dataGolfTourFromEnv();

  await prisma.$transaction(async (tx) => {
    const market = await tx.sideBetMarket.upsert({
      where: { tournamentLineupId },
      create: {
        tournamentLineupId,
        tournamentId: lineup.tournamentId,
        status: SideBetMarketStatus.UNAVAILABLE,
        unavailableReason: "ROSTER_CHANGED",
        quoteVersion: 0,
        datagolfTour: tour,
      },
      update: {
        status: SideBetMarketStatus.UNAVAILABLE,
        unavailableReason: "ROSTER_CHANGED",
      },
    });

    await tx.sideBetSelection.deleteMany({
      where: { sideBetMarketId: market.id },
    });
  });
}
