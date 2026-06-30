/**
 * Seed local DB for commodities plugin evaluation: enable sport, init event, OPEN contest.
 *
 * Usage:
 *   pnpm --filter server run script:commodities-local-eval
 *   pnpm --filter server run script:commodities-local-eval 2026-W27
 */

import "dotenv/config";
import { Prisma } from "@prisma/client";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { prisma } from "../lib/prisma.js";
import { getCurrentCommoditiesWeekExternalId } from "../sports/commodities/externalId.js";
import { initCommoditiesEvent } from "../sports/commodities/initEvent.js";
import { mergeCommoditiesEventMetadata } from "../sports/commodities/metadataMerge.js";
import { requireSportModule } from "../sports/registry.js";

const EVAL_CONTEST_NAME = "Commodity Picks — Local Eval";
const EVAL_CONTEST_ADDRESS = "0x000000000000000000000000000000000000c012";
const BASE_SEPOLIA_CHAIN_ID = 84532;

/** Keep lineups editable locally even when wall clock is inside the trading week. */
async function pinLocalEvalSessionScheduled(eventId: string): Promise<void> {
  const event = await prisma.competitionEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error(`Event not found: ${eventId}`);
  }

  const metadata = mergeCommoditiesEventMetadata(event.metadata, {
    commodities: {
      sessionStarted: false,
      sessionComplete: false,
    },
  });

  await prisma.competitionEvent.update({
    where: { id: eventId },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });
}

async function main(): Promise<void> {
  const externalId = process.argv[2] ?? getCurrentCommoditiesWeekExternalId();

  const sport = await prisma.sport.update({
    where: { id: COMMODITIES_SPORT_ID },
    data: { isEnabled: true },
  });
  console.log(`[sport] enabled: ${sport.slug}`);

  let event = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, externalId },
  });

  if (!event) {
    await initCommoditiesEvent(externalId);
    event = await prisma.competitionEvent.findFirst({
      where: { sportId: COMMODITIES_SPORT_ID, externalId },
    });
    if (!event) throw new Error(`Event not found after init: ${externalId}`);
    console.log(`[event] initialized: ${event.id} (${event.externalId})`);
  } else {
    await initCommoditiesEvent(externalId);
    const module = requireSportModule(COMMODITIES_SPORT_ID);
    await module.syncParticipantField(event.id);
    console.log(`[event] exists: ${event.id} (${event.externalId}) — refreshed weekly session + fixture data`);
  }

  await pinLocalEvalSessionScheduled(event.id);

  const existing = await prisma.contest.findFirst({
    where: { eventId: event.id, name: EVAL_CONTEST_NAME },
  });

  if (existing) {
    console.log(`[contest] already exists: ${existing.id} (${existing.status})`);
    console.log(`\nBrowse: /sports/commodities/events/${event.id}\n`);
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
  console.log(`\nBrowse: /sports/commodities/events/${event.id}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
