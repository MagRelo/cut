/**
 * Generate the PGA golf tournament preview for an event.
 *
 *   pnpm --filter server run script:golf-event-summary R2026540
 *   pnpm --filter server run script:golf-event-summary R2026540 --force
 */

import "dotenv/config";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { prisma } from "../lib/prisma.js";
import { generateGolfEventSummary } from "../sports/pga-golf/generateEventSummary.js";

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const force = args.includes("--force");
  const externalId = args.find((arg) => !arg.startsWith("--"))?.trim();
  if (!externalId) {
    console.error(
      "Usage: pnpm --filter server run script:golf-event-summary <pgaTourId> [--force]",
    );
    process.exit(1);
  }

  const event = await prisma.competitionEvent.findFirst({
    where: { sportId: PGA_GOLF_SPORT_ID, externalId },
    select: { id: true },
  });
  if (!event) {
    throw new Error(
      `No pga-golf CompetitionEvent for externalId=${externalId}. Run service:init-event first.`,
    );
  }

  const result = await generateGolfEventSummary(event.id, { force });
  console.log(`[pga-golf] Event summary ${result} for ${externalId}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
