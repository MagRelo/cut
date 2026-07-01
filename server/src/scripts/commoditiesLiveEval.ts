/**
 * Local LIVE eval: fixture prices, ACTIVE contest, three scored lineups — no on-chain contract.
 *
 * Usage:
 *   pnpm --filter server run script:commodities-live-eval
 *   pnpm --filter server run script:commodities-live-eval -- --cleanup
 */

import "dotenv/config";
process.env.COMMODITIES_USE_FIXTURE_PRICES = "true";

import {
  COMMODITIES_SPORT_ID,
  commodityExternalId,
} from "@cut/sport-commodities";
import { readPeriodDisplay } from "@cut/sport-sdk";
import { prisma } from "../lib/prisma.js";
import { createLineupForEvent } from "../services/lineups/createLineupForEvent.js";
import { updateContestLineupsForEvent } from "../services/updateContestLineups.js";
import { requireSportModule } from "../sports/registry.js";
import { getCurrentCommoditiesWeekExternalId } from "../sports/commodities/externalId.js";
import { initCommoditiesEvent } from "../sports/commodities/initEvent.js";
import { syncCommoditiesLiveScores } from "../sports/commodities/syncLiveScores.js";
import { syncCommoditiesEventMetadata } from "../sports/commodities/syncMetadata.js";

const EVAL_CONTEST_NAME = "Commodity Picks — Live Eval";
const EVAL_CONTEST_ADDRESS = "0x000000000000000000000000000000000000c013";
const BASE_SEPOLIA_CHAIN_ID = 84532;

type PickSpec = { label: string; externalId: string };

type LineupSpec = {
  userIndex: number;
  name: string;
  picks: string[];
  predictionStored: number;
  entryId: string;
};

function parseArgs(): { externalId: string; cleanup: boolean } {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  return {
    externalId: args.find((a) => !a.startsWith("--")) ?? getCurrentCommoditiesWeekExternalId(),
    cleanup: args.includes("--cleanup"),
  };
}

function liveSessionBounds(): { sessionOpen: string; sessionClose: string } {
  const hourMs = 60 * 60 * 1000;
  return {
    sessionOpen: new Date(Date.now() - 60 * hourMs).toISOString(),
    sessionClose: new Date(Date.now() + 72 * hourMs).toISOString(),
  };
}

async function resolvePickIds(
  eventId: string,
  picks: PickSpec[],
): Promise<Map<string, string>> {
  const rows = await prisma.eventParticipant.findMany({
    where: {
      eventId,
      participant: { externalId: { in: picks.map((pick) => pick.externalId) } },
    },
    include: { participant: { select: { externalId: true } } },
  });

  const byExternalId = new Map(rows.map((row) => [row.participant.externalId, row.id] as const));
  for (const pick of picks) {
    if (!byExternalId.has(pick.externalId)) {
      throw new Error(`Contract ${pick.externalId} (${pick.label}) not in event field`);
    }
  }
  return byExternalId;
}

async function cleanupEvalContest(eventId: string): Promise<void> {
  const contest = await prisma.contest.findFirst({
    where: { eventId, name: EVAL_CONTEST_NAME },
    select: { id: true },
  });

  if (!contest) {
    return;
  }

  await prisma.contestLineupTimeline.deleteMany({ where: { contestId: contest.id } });
  await prisma.contestLineup.deleteMany({ where: { contestId: contest.id } });
  await prisma.lineup.deleteMany({ where: { contestId: contest.id } });
  await prisma.contest.delete({ where: { id: contest.id } });
  console.log(`[cleanup] Removed prior eval contest ${contest.id}`);
}

async function main(): Promise<void> {
  const { externalId, cleanup } = parseArgs();

  if (cleanup) {
    const event = await prisma.competitionEvent.findFirst({
      where: { sportId: COMMODITIES_SPORT_ID, externalId },
      select: { id: true },
    });
    if (event) {
      await cleanupEvalContest(event.id);
    }
    return;
  }

  await prisma.sport.update({
    where: { id: COMMODITIES_SPORT_ID },
    data: { isEnabled: true },
  });

  const bounds = liveSessionBounds();
  await initCommoditiesEvent(externalId, bounds);
  await syncCommoditiesEventMetadata(
    (
      await prisma.competitionEvent.findFirstOrThrow({
        where: { sportId: COMMODITIES_SPORT_ID, externalId },
        select: { id: true },
      })
    ).id,
  );

  const event = await prisma.competitionEvent.findFirstOrThrow({
    where: { sportId: COMMODITIES_SPORT_ID, externalId },
  });

  await syncCommoditiesLiveScores(event.id);

  const sportModule = requireSportModule(COMMODITIES_SPORT_ID);
  const eventStatus = await sportModule.getEventStatus(event.id);
  if (eventStatus !== "LIVE") {
    throw new Error(`Expected LIVE event, got ${eventStatus}`);
  }

  await cleanupEvalContest(event.id);

  const catalog: PickSpec[] = [
    { label: "Gold", externalId: commodityExternalId("GOLD") },
    { label: "Silver", externalId: commodityExternalId("SILVER") },
    { label: "Copper", externalId: commodityExternalId("COPPER") },
    { label: "Crude", externalId: commodityExternalId("CL") },
    { label: "Brent", externalId: commodityExternalId("BRENTOIL") },
    { label: "Natural Gas", externalId: commodityExternalId("NATGAS") },
  ];
  const pickIds = await resolvePickIds(event.id, catalog);
  const pick = (...extIds: string[]) => extIds.map((id) => pickIds.get(id)!);

  const users = await prisma.user.findMany({
    take: 3,
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true },
  });
  if (users.length < 3) {
    throw new Error("Need at least 3 users in DB — register a few accounts first");
  }

  const lineupSpecs: LineupSpec[] = [
    {
      userIndex: 0,
      name: "Live Eval — energy heavy",
      picks: pick(commodityExternalId("CL"), commodityExternalId("BRENTOIL"), commodityExternalId("GOLD")),
      predictionStored: 12,
      entryId: "930001",
    },
    {
      userIndex: 1,
      name: "Live Eval — precious/metals",
      picks: pick(
        commodityExternalId("GOLD"),
        commodityExternalId("SILVER"),
        commodityExternalId("COPPER"),
      ),
      predictionStored: 8,
      entryId: "930002",
    },
    {
      userIndex: 2,
      name: "Live Eval — balanced",
      picks: pick(
        commodityExternalId("GOLD"),
        commodityExternalId("CL"),
        commodityExternalId("SILVER"),
      ),
      predictionStored: 10,
      entryId: "930003",
    },
  ];

  const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const contest = await prisma.contest.create({
    data: {
      name: EVAL_CONTEST_NAME,
      description: "Fixture-data live eval — no on-chain contract",
      eventId: event.id,
      endTime,
      address: EVAL_CONTEST_ADDRESS,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      status: "ACTIVE",
    },
  });

  const createdLineups: Array<{ spec: LineupSpec; lineupId: string; userId: string }> = [];

  for (const spec of lineupSpecs) {
    const user = users[spec.userIndex]!;
    const result = await createLineupForEvent({
      userId: user.id,
      eventId: event.id,
      name: spec.name,
      picks: spec.picks,
      prediction: { type: "winningLineupTotal", value: spec.predictionStored },
    });

    if ("error" in result) {
      throw new Error(`Lineup create failed (${spec.name}): ${JSON.stringify(result)}`);
    }

    createdLineups.push({ spec, lineupId: result.lineup.id, userId: user.id });
  }

  for (const { spec, lineupId, userId } of createdLineups) {
    await prisma.lineup.update({
      where: { id: lineupId },
      data: { contestId: contest.id },
    });
    await prisma.contestLineup.create({
      data: {
        contestId: contest.id,
        lineupId,
        userId,
        entryId: spec.entryId,
        status: "ACTIVE",
      },
    });
  }

  await updateContestLineupsForEvent(event.id, COMMODITIES_SPORT_ID);

  const contestLineups = await prisma.contestLineup.findMany({
    where: { contestId: contest.id },
    orderBy: { position: "asc" },
    include: {
      lineup: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  const periodDisplay = readPeriodDisplay(event.metadata) ?? "?";

  console.log("\n=== Commodities Live Eval ready ===\n");
  console.log(`Event:     ${event.id} (${externalId}) — ${eventStatus}, ${periodDisplay}`);
  console.log(`Contest:   ${contest.id} (${contest.status})`);
  console.log(`Session:   ${bounds.sessionOpen}`);
  console.log(`        →  ${bounds.sessionClose}`);
  console.log(`Fixture:   COMMODITIES_USE_FIXTURE_PRICES=true\n`);

  console.log("Leaderboard:");
  for (const row of contestLineups) {
    console.log(
      `  #${row.position} ${row.score ?? 0} pts — ${row.user.name ?? row.user.email} — "${row.lineup.name}"`,
    );
  }

  console.log("\nBrowse:");
  console.log(`  Event:   /sports/commodities/events/${event.id}`);
  console.log(`  Contest: /contest/${EVAL_CONTEST_ADDRESS}`);
  console.log("\nCleanup:");
  console.log(`  pnpm --filter server run script:commodities-live-eval -- --cleanup ${externalId}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
