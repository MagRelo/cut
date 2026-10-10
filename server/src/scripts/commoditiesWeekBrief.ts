/**
 * Generate the commodities contest week brief for an event.
 *
 *   pnpm --filter server run script:commodities-week-brief 2026-W42
 *   pnpm --filter server run script:commodities-week-brief 2026-W42 --force
 */

import "dotenv/config";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { prisma } from "../lib/prisma.js";
import { parseCommoditiesSessionExternalId } from "../sports/commodities/externalId.js";
import { generateCommoditiesWeekBrief } from "../sports/commodities/generateWeekBrief.js";

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const force = args.includes("--force");
  const externalIdArg = args.find((arg) => !arg.startsWith("--"));
  if (!externalIdArg) {
    console.error(
      "Usage: pnpm --filter server run script:commodities-week-brief <YYYY-Www> [--force]",
    );
    process.exit(1);
  }

  const externalId = parseCommoditiesSessionExternalId(externalIdArg);
  const event = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, externalId },
    select: { id: true },
  });
  if (!event) {
    throw new Error(
      `No commodities CompetitionEvent for externalId=${externalId}. Run service:init-event first.`,
    );
  }

  const result = await generateCommoditiesWeekBrief(event.id, { force });
  console.log(`[commodities] Week brief ${result} for ${externalId}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
