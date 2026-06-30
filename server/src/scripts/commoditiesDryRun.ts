/**
 * End-to-end dry run for commodities on a weekly session.
 *
 * Usage:
 *   pnpm --filter server run script:commodities-dry-run 2026-W27
 *   pnpm --filter server run script:commodities-dry-run -- --cleanup
 */

import "dotenv/config";
process.env.COMMODITIES_USE_FIXTURE_PRICES = "true";

import { COMMODITIES_SPORT_ID, commodityExternalId, getEventFieldSnapshot } from "@cut/sport-commodities";
import { prisma } from "../lib/prisma.js";
import { requireSportModule } from "../sports/registry.js";
import { createLineupForEvent } from "../services/lineups/createLineupForEvent.js";
import { updateContestLineupsForEvent } from "../services/updateContestLineups.js";
import { runSportEventPipeline } from "../services/cron/runSportEventPipeline.js";
import { batchActivateContests } from "../services/batch/batchActivateContests.js";
import { batchSettleContests } from "../services/batch/batchSettleContests.js";

const DRY_RUN_CONTEST_ADDRESS = "0x000000000000000000000000000000000000c011";
const BASE_SEPOLIA_CHAIN_ID = 84532;

function dryRunContestName(externalId: string): string {
  return `Commodities Dry Run — ${externalId}`;
}

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
  const cleanup = args.includes("--cleanup");
  const positional = args.filter((a) => !a.startsWith("--"));
  return {
    externalId: positional[0] ?? "2026-W27",
    cleanup,
  };
}

async function resolveEvent(externalId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, externalId },
    include: { sport: true },
  });
  if (!event) {
    throw new Error(
      `Commodities event not found for externalId=${externalId}. Run service:init-event first.`,
    );
  }
  return event;
}

async function resolvePickIds(
  eventId: string,
  picks: PickSpec[],
): Promise<Map<string, string>> {
  const externalIds = picks.map((p) => p.externalId);
  const rows = await prisma.eventParticipant.findMany({
    where: {
      eventId,
      participant: { externalId: { in: externalIds } },
    },
    include: { participant: { select: { externalId: true, displayName: true } } },
  });

  const byExternalId = new Map(
    rows.map((row) => [row.participant.externalId, row.id] as const),
  );

  for (const pick of picks) {
    if (!byExternalId.has(pick.externalId)) {
      throw new Error(`Contract ${pick.externalId} (${pick.label}) not in event field`);
    }
  }

  return byExternalId;
}

async function cleanupDryRunData(eventId: string, contestName: string): Promise<void> {
  const contest = await prisma.contest.findFirst({
    where: { eventId, name: contestName },
    select: { id: true },
  });

  if (contest) {
    await prisma.contestLineupTimeline.deleteMany({ where: { contestId: contest.id } });
    await prisma.contestLineup.deleteMany({ where: { contestId: contest.id } });
    await prisma.lineup.deleteMany({ where: { contestId: contest.id } });
    await prisma.contest.delete({ where: { id: contest.id } });
    console.log(`[cleanup] Removed dry-run contest ${contest.id}`);
  } else {
    console.log("[cleanup] No prior dry-run contest found");
  }

  const orphaned = await prisma.lineup.deleteMany({
    where: {
      eventId,
      name: { startsWith: "Dry Run —" },
    },
  });
  if (orphaned.count > 0) {
    console.log(`[cleanup] Removed ${orphaned.count} orphaned dry-run lineup(s)`);
  }
}

async function main(): Promise<void> {
  const { externalId, cleanup } = parseArgs();
  const contestName = dryRunContestName(externalId);

  const event = await resolveEvent(externalId);
  const sportModule = requireSportModule(COMMODITIES_SPORT_ID);

  if (cleanup) {
    await cleanupDryRunData(event.id, contestName);
    return;
  }

  console.log(`\n=== Commodities Dry Run: ${externalId} (${event.id}) ===\n`);

  const fieldCount = await prisma.eventParticipant.count({ where: { eventId: event.id } });
  console.log(`[check] isActive=${event.isActive} fieldCount=${fieldCount}`);
  if (!event.isActive) {
    throw new Error("Event is not active");
  }
  const expectedFieldCount = getEventFieldSnapshot(event.metadata).length || fieldCount;
  if (fieldCount !== expectedFieldCount) {
    throw new Error(`Expected ${expectedFieldCount} contracts, found ${fieldCount}`);
  }

  console.log("[pipeline] Running sport event pipeline...");
  await runSportEventPipeline(event.id, COMMODITIES_SPORT_ID);

  const scoredCount = await prisma.eventParticipant.count({
    where: { eventId: event.id, total: { not: null } },
  });
  console.log(`[check] scored contracts=${scoredCount}/${fieldCount}`);

  const eventStatus = await sportModule.getEventStatus(event.id);
  console.log(`[check] eventStatus=${eventStatus}`);
  console.log(
    `[check] shouldSyncLiveScores=${await sportModule.shouldSyncLiveScores(event.id)}`,
  );

  // Historical date is COMPLETE by wall clock — expected for dry-run
  if (eventStatus !== "COMPLETE") {
    console.warn(`[warn] Expected COMPLETE for historical session, got ${eventStatus}`);
  }

  await cleanupDryRunData(event.id, contestName);

  const catalog: PickSpec[] = [
    { label: "Gold", externalId: commodityExternalId("GOLD") },
    { label: "Silver", externalId: commodityExternalId("SILVER") },
    { label: "Copper", externalId: commodityExternalId("COPPER") },
    { label: "Crude", externalId: commodityExternalId("CL") },
    { label: "Brent", externalId: commodityExternalId("BRENTOIL") },
    { label: "Natural Gas", externalId: commodityExternalId("NATGAS") },
    { label: "Platinum", externalId: commodityExternalId("PLATINUM") },
    { label: "Palladium", externalId: commodityExternalId("PALLADIUM") },
  ];
  const pickIds = await resolvePickIds(event.id, catalog);
  const pick = (...extIds: string[]) => extIds.map((id) => pickIds.get(id)!);

  const users = await prisma.user.findMany({
    take: 3,
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (users.length < 3) {
    throw new Error("Need at least 3 users in DB for dry-run lineups");
  }

  const lineupSpecs: LineupSpec[] = [
    {
      userIndex: 0,
      name: "Dry Run — energy heavy",
      picks: pick(
        commodityExternalId("CL"),
        commodityExternalId("BRENTOIL"),
        commodityExternalId("GOLD"),
      ),
      predictionStored: 550,
      entryId: "920001",
    },
    {
      userIndex: 1,
      name: "Dry Run — mixed (farther prediction)",
      picks: pick(
        commodityExternalId("GOLD"),
        commodityExternalId("SILVER"),
        commodityExternalId("COPPER"),
      ),
      predictionStored: 200,
      entryId: "920002",
    },
    {
      userIndex: 2,
      name: "Dry Run — mixed (closer prediction)",
      picks: pick(
        commodityExternalId("GOLD"),
        commodityExternalId("CL"),
        commodityExternalId("SILVER"),
      ),
      predictionStored: 280,
      entryId: "920003",
    },
  ];

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
    console.log(`[lineup] ${spec.name} → ${result.lineup.id} (user: ${user.name})`);
  }

  const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const contest = await prisma.contest.create({
    data: {
      name: contestName,
      description: "Commodities local dry run — no on-chain contract",
      eventId: event.id,
      endTime,
      address: DRY_RUN_CONTEST_ADDRESS,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      status: "OPEN",
    },
  });
  console.log(`[contest] created ${contest.id}`);

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
      lineup: { select: { name: true, prediction: true } },
      user: { select: { name: true } },
    },
  });

  console.log("\n[leaderboard]");
  for (const row of contestLineups) {
    console.log(
      `  #${row.position} score=${row.score} entry=${row.entryId} user=${row.user.name} lineup="${row.lineup.name}"`,
    );
  }

  const winner = contestLineups[0];
  if (!winner || (winner.score ?? 0) <= 0) {
    throw new Error("Expected positive winning score from deterministic fixture returns");
  }

  console.log(`[check] winner score=${winner.score} entry=${winner.entryId}`);

  const activateResult = await batchActivateContests();
  console.log(`\n[batchActivate] total=${activateResult.total}`);

  await prisma.contest.update({
    where: { id: contest.id },
    data: { status: "ACTIVE" },
  });

  const settleResult = await batchSettleContests();
  const dryRunSettle = settleResult.results.find((r) => r.contestId === contest.id);
  console.log(
    `[batchSettle] success=${dryRunSettle?.success ?? false}${dryRunSettle?.error ? ` error=${dryRunSettle.error}` : ""}`,
  );

  console.log("\n=== Commodities Dry Run PASSED ===\n");
  console.log(`Cleanup: pnpm --filter server run script:commodities-dry-run -- --cleanup ${externalId}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
