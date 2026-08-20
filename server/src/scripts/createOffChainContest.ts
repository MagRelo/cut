/**
 * Create a $0 (off-chain) contest: DB row only, no ContestController.
 *
 * Usage:
 *   pnpm --filter server run script:create-off-chain-contest -- <eventId> [contestName]
 */

import "dotenv/config";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { prisma } from "../lib/prisma.js";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const EXPIRY_DAYS_AFTER_SESSION = 7;

function parseArgs(): { eventId: string; name: string } {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const eventId = args[0]?.trim();
  if (!eventId) {
    throw new Error(
      "Usage: pnpm --filter server run script:create-off-chain-contest -- <eventId> [contestName]",
    );
  }
  return {
    eventId,
    name: args[1]?.trim() || "Free contest",
  };
}

async function main(): Promise<void> {
  const { eventId, name } = parseArgs();

  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    include: { sport: true },
  });
  if (!event) {
    throw new Error(`Event not found: ${eventId}`);
  }

  const existing = await prisma.contest.findFirst({
    where: { eventId, name },
    select: { id: true, address: true, status: true },
  });
  if (existing) {
    console.log(`[contest] already exists: ${existing.id} (${existing.status})`);
    return;
  }

  const sessionClose =
    typeof event.metadata === "object" &&
    event.metadata !== null &&
    "commodities" in event.metadata &&
    typeof (event.metadata as { commodities?: { sessionClose?: string } }).commodities
      ?.sessionClose === "string"
      ? (event.metadata as { commodities: { sessionClose: string } }).commodities.sessionClose
      : undefined;

  const expiryMs =
    (sessionClose ? new Date(sessionClose).getTime() : Date.now()) +
    EXPIRY_DAYS_AFTER_SESSION * 24 * 60 * 60 * 1000;
  const expiryTimestamp = Math.floor(expiryMs / 1000);
  const endTime = new Date(expiryTimestamp * 1000);

  const contest = await prisma.contest.create({
    data: {
      name,
      description: `${event.sport.name} — ${event.externalId}`,
      eventId: event.id,
      endTime,
      address: null,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      status: "OPEN",
      settings: {
        contestType: "PUBLIC",
        chainId: BASE_SEPOLIA_CHAIN_ID,
        expiryTimestamp,
        primaryDeposit: 0,
        referralNetworkBps: 0,
        primaryDepositSecondarySubsidyBps: 0,
      },
    },
  });

  console.log(`[contest] created off-chain: ${contest.id}`);
  console.log(`[contest] status: ${contest.status}`);
  console.log(`\nBrowse: /contest/${contest.id}`);
  if (event.sportId === COMMODITIES_SPORT_ID) {
    console.log(`Event: /sports/commodities/events/${event.id}\n`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
