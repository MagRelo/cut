/**
 * Force-refresh quotes + sparkline history for the active commodities event.
 * Usage: pnpm --filter server run script:commodities-refresh-candidates
 */

import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { syncCommoditiesParticipantField } from "../sports/commodities/syncField.js";

async function main(): Promise<void> {
  const event = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, isActive: true },
  });
  if (!event) {
    throw new Error("No active commodities event");
  }

  await syncCommoditiesParticipantField(event.id);
  console.log(`[commodities] Refreshed candidate data for event ${event.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
