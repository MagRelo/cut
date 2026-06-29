/**
 * Seed local DB for commodities plugin evaluation: enable sport, init event, OPEN contest.
 *
 * Usage:
 *   COMMODITIES_USE_FIXTURE_PRICES=true pnpm --filter server run script:commodities-local-eval
 *   COMMODITIES_USE_FIXTURE_PRICES=true pnpm --filter server run script:commodities-local-eval 2026-06-30
 */

import "dotenv/config";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { prisma } from "../lib/prisma.js";
import { requireSportModule } from "../sports/registry.js";

const EVAL_CONTEST_NAME = "Commodity Picks — Local Eval";
const EVAL_CONTEST_ADDRESS = "0x000000000000000000000000000000000000c012";
const BASE_SEPOLIA_CHAIN_ID = 84532;

async function main(): Promise<void> {
  const externalId = process.argv[2] ?? "2026-06-30";

  const sport = await prisma.sport.update({
    where: { id: COMMODITIES_SPORT_ID },
    data: { isEnabled: true },
  });
  console.log(`[sport] enabled: ${sport.slug}`);

  let event = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, externalId },
  });

  if (!event) {
    const module = requireSportModule(COMMODITIES_SPORT_ID);
    await module.initEvent(externalId);
    event = await prisma.competitionEvent.findFirst({
      where: { sportId: COMMODITIES_SPORT_ID, externalId },
    });
    if (!event) throw new Error(`Event not found after init: ${externalId}`);
    console.log(`[event] initialized: ${event.id} (${event.externalId})`);
  } else {
    console.log(`[event] exists: ${event.id} (${event.externalId}, ${event.status})`);
  }

  const existing = await prisma.contest.findFirst({
    where: { eventId: event.id, name: EVAL_CONTEST_NAME },
  });

  if (existing) {
    console.log(`[contest] already exists: ${existing.id} (${existing.status})`);
    return;
  }

  const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const contest = await prisma.contest.create({
    data: {
      name: EVAL_CONTEST_NAME,
      description: "Local evaluation contest — no on-chain contract",
      eventId: event.id,
      endTime,
      address: EVAL_CONTEST_ADDRESS,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      status: "OPEN",
    },
  });
  console.log(`[contest] created: ${contest.id} (${contest.status})`);
  console.log(`\nBrowse: /sports/commodities/events/${event.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
