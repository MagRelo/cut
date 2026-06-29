/**
 * Stage 8 end-to-end dry run for F1 on a historical race (default: session_key 9558).
 *
 * Usage:
 *   pnpm --filter server run script:f1-dry-run
 *   pnpm --filter server run script:f1-dry-run 9558
 *   pnpm --filter server run script:f1-dry-run -- --cleanup
 */

import "dotenv/config";
import { F1_SPORT_ID } from "@cut/sport-f1";
import { prisma } from "../lib/prisma.js";
import { requireSportModule } from "../sports/registry.js";
import { createLineupForEvent } from "../services/lineups/createLineupForEvent.js";
import { updateContestLineupsForEvent } from "../services/updateContestLineups.js";
import { runSportEventPipeline } from "../services/cron/runSportEventPipeline.js";
import { batchActivateContests } from "../services/batch/batchActivateContests.js";
import { batchSettleContests } from "../services/batch/batchSettleContests.js";

const DRY_RUN_CONTEST_NAME = "F1 Dry Run — British GP 2024 (9558)";
const DRY_RUN_CONTEST_ADDRESS = "0x000000000000000000000000000000000000f108";
const BASE_SEPOLIA_CHAIN_ID = 84532;

type DriverPick = {
  label: string;
  externalId: string;
};

type LineupSpec = {
  userIndex: number;
  name: string;
  drivers: string[];
  prediction: number;
  entryId: string;
};

function parseArgs(): { externalId: string; cleanup: boolean } {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const cleanup = args.includes("--cleanup");
  const positional = args.filter((a) => !a.startsWith("--"));
  return {
    externalId: positional[0] ?? "9558",
    cleanup,
  };
}

async function resolveEvent(externalId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { sportId: F1_SPORT_ID, externalId },
    include: { sport: true },
  });
  if (!event) {
    throw new Error(`F1 event not found for externalId=${externalId}. Run service:init-event first.`);
  }
  return event;
}

async function resolveDriverIds(
  eventId: string,
  drivers: DriverPick[],
): Promise<Map<string, string>> {
  const rows = await prisma.eventParticipant.findMany({
    where: {
      eventId,
      participant: {
        externalId: { in: drivers.map((d) => d.externalId) },
      },
    },
    include: {
      participant: { select: { externalId: true, displayName: true } },
    },
  });

  const byExternalId = new Map(
    rows.map((row) => [row.participant.externalId, row.id] as const),
  );

  for (const driver of drivers) {
    if (!byExternalId.has(driver.externalId)) {
      throw new Error(`Driver ${driver.externalId} (${driver.label}) not in event field`);
    }
  }

  return byExternalId;
}

async function cleanupDryRunData(eventId: string): Promise<void> {
  const contest = await prisma.contest.findFirst({
    where: { eventId, name: DRY_RUN_CONTEST_NAME },
    select: { id: true },
  });

  if (!contest) {
    console.log("[cleanup] No prior dry-run contest found");
    return;
  }

  await prisma.contestLineupTimeline.deleteMany({
    where: { contestId: contest.id },
  });
  await prisma.contestLineup.deleteMany({ where: { contestId: contest.id } });
  await prisma.lineup.deleteMany({ where: { contestId: contest.id } });
  await prisma.contest.delete({ where: { id: contest.id } });
  console.log(`[cleanup] Removed dry-run contest ${contest.id}`);
}

async function main(): Promise<void> {
  const { externalId, cleanup } = parseArgs();
  const event = await resolveEvent(externalId);
  const sportModule = requireSportModule(F1_SPORT_ID);

  if (cleanup) {
    await cleanupDryRunData(event.id);
    return;
  }

  console.log(`\n=== F1 Dry Run: ${externalId} (${event.id}) ===\n`);

  // 1. Verify event activation + field
  const fieldCount = await prisma.eventParticipant.count({ where: { eventId: event.id } });
  console.log(`[check] isActive=${event.isActive} fieldCount=${fieldCount}`);
  if (!event.isActive) {
    throw new Error("Event is not active");
  }
  if (fieldCount < 15) {
    throw new Error(`Expected ~20 drivers, found ${fieldCount}`);
  }

  // 2. Sync scores via cron pipeline (metadata + field + scores when COMPLETE)
  console.log("[pipeline] Running sport event pipeline...");
  await runSportEventPipeline(event.id, F1_SPORT_ID);

  const scoredCount = await prisma.eventParticipant.count({
    where: { eventId: event.id, total: { not: null } },
  });
  console.log(`[check] scored drivers=${scoredCount}/${fieldCount}`);
  if (scoredCount < fieldCount) {
    throw new Error("Not all drivers have scores after sync");
  }

  const topScorer = await prisma.eventParticipant.findFirst({
    where: { eventId: event.id },
    orderBy: { total: "desc" },
    include: { participant: { select: { displayName: true, externalId: true } } },
  });
  console.log(
    `[check] top scorer: ${topScorer?.participant.displayName} (${topScorer?.participant.externalId}) = ${topScorer?.total}`,
  );

  const eventStatus = await sportModule.getEventStatus(event.id);
  console.log(`[check] eventStatus=${eventStatus}`);
  console.log(
    `[check] shouldActivateContest=${sportModule.shouldActivateContest(eventStatus)} shouldSettleContest=${sportModule.shouldSettleContest(eventStatus)} shouldSyncLiveScores=${await sportModule.shouldSyncLiveScores(event.id)}`,
  );

  if (eventStatus !== "COMPLETE") {
    throw new Error(`Expected COMPLETE for historical race, got ${eventStatus}`);
  }

  // 3. Clean prior dry-run artifacts
  await cleanupDryRunData(event.id);

  const driverCatalog: DriverPick[] = [
    { label: "HAM", externalId: "44" },
    { label: "VER", externalId: "1" },
    { label: "NOR", externalId: "4" },
    { label: "PIA", externalId: "81" },
    { label: "SAI", externalId: "55" },
    { label: "HUL", externalId: "27" },
  ];
  const driverIds = await resolveDriverIds(event.id, driverCatalog);
  const pick = (...extIds: string[]) => extIds.map((id) => driverIds.get(id)!);

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
      name: "Dry Run — P1 lineup",
      drivers: pick("44", "1", "4", "81"),
      prediction: 68,
      entryId: "910001",
    },
    {
      userIndex: 1,
      name: "Dry Run — tied 56 (farther prediction)",
      drivers: pick("1", "4", "81", "55"),
      prediction: 55,
      entryId: "910002",
    },
    {
      userIndex: 2,
      name: "Dry Run — tied 56 (closer prediction)",
      drivers: pick("44", "81", "55", "27"),
      prediction: 58,
      entryId: "910003",
    },
  ];

  const createdLineups: Array<{ spec: LineupSpec; lineupId: string; userId: string }> = [];

  for (const spec of lineupSpecs) {
    const user = users[spec.userIndex]!;
    const result = await createLineupForEvent({
      userId: user.id,
      eventId: event.id,
      name: spec.name,
      picks: spec.drivers,
      prediction: { type: "winningLineupTotal", value: spec.prediction },
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
      name: DRY_RUN_CONTEST_NAME,
      description: "Stage 8 local dry run — no on-chain contract",
      eventId: event.id,
      endTime,
      address: DRY_RUN_CONTEST_ADDRESS,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      status: "OPEN",
    },
  });
  console.log(`[contest] created ${contest.id} (${contest.status})`);

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
  console.log(`[contest] linked ${createdLineups.length} entries`);

  // 4. Score + rank contest lineups
  await updateContestLineupsForEvent(event.id, F1_SPORT_ID);

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

  const expectedOrder = ["910001", "910003", "910002"];
  const actualOrder = contestLineups.map((r) => r.entryId);
  if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) {
    throw new Error(
      `Leaderboard order mismatch.\n  expected: ${expectedOrder.join(", ")}\n  actual:   ${actualOrder.join(", ")}`,
    );
  }

  const winner = contestLineups[0];
  if (winner?.score !== 70) {
    throw new Error(`Expected winning score 70 (HAM+VER+NOR+PIA), got ${winner?.score}`);
  }

  // 5. Contest lifecycle checks (no on-chain tx for historical COMPLETE race)
  const activateResult = await batchActivateContests();
  console.log(
    `\n[batchActivate] total=${activateResult.total} (expect 0 — event is COMPLETE, not LIVE)`,
  );
  if (activateResult.total !== 0) {
    console.warn("[warn] OPEN contests were activated despite COMPLETE event — review sport status rules");
  }

  await prisma.contest.update({
    where: { id: contest.id },
    data: { status: "ACTIVE" },
  });
  console.log("[contest] patched OPEN → ACTIVE (simulates post-race-start state)");

  const settleResult = await batchSettleContests();
  const dryRunSettle = settleResult.results.find((r) => r.contestId === contest.id);
  console.log(
    `[batchSettle] dry-run contest settle success=${dryRunSettle?.success ?? false}${dryRunSettle?.error ? ` error=${dryRunSettle.error}` : ""}`,
  );
  if (dryRunSettle?.success) {
    console.log("[batchSettle] On-chain settlement succeeded (unexpected for dummy address)");
  } else {
    console.log(
      "[batchSettle] Expected failure without real contract — ranking/tie-break verified above",
    );
  }

  console.log("\n=== F1 Dry Run PASSED ===\n");
  console.log(`Contest id: ${contest.id}`);
  console.log(`Cleanup: pnpm --filter server run script:f1-dry-run -- --cleanup`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
