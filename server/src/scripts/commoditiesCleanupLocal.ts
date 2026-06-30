/**
 * Remove all commodities CompetitionEvents and related contests/lineups from the local DB.
 *
 * Usage:
 *   pnpm --filter server run script:commodities-cleanup-local
 *   pnpm --filter server run script:commodities-cleanup-local --dry-run
 */

import "dotenv/config";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { prisma } from "../lib/prisma.js";

function assertLocalDatabaseUrl(databaseUrl: string | undefined): void {
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }

  let host: string;
  try {
    const normalized = databaseUrl.replace(/^postgres(ql)?:\/\//, "http://");
    host = new URL(normalized).hostname.toLowerCase();
  } catch {
    throw new Error("DATABASE_URL is not a valid connection string");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "postgres", "db", "postgresql"]);
  const isLocal =
    localHosts.has(host) || host.endsWith(".local") || host === "host.docker.internal";

  if (!isLocal) {
    throw new Error(
      `Refusing to run: DATABASE_URL host "${host}" does not look local. Use Prisma Studio or a manual script on non-local databases.`,
    );
  }
}

function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  return { dryRun: args.includes("--dry-run") };
}

async function deleteContestGraph(contestId: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    return;
  }

  await prisma.contestLineupTimeline.deleteMany({ where: { contestId } });
  await prisma.contestLineup.deleteMany({ where: { contestId } });
  await prisma.contestSecondaryParticipant.deleteMany({ where: { contestId } });
  await prisma.lineup.deleteMany({ where: { contestId } });
  await prisma.contest.delete({ where: { id: contestId } });
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs();
  assertLocalDatabaseUrl(process.env.DATABASE_URL);

  const events = await prisma.competitionEvent.findMany({
    where: { sportId: COMMODITIES_SPORT_ID },
    select: { id: true, externalId: true },
  });

  const catalogCount = await prisma.participant.count({
    where: { sportId: COMMODITIES_SPORT_ID },
  });

  let contestsRemoved = 0;
  let lineupsRemoved = 0;
  let eventParticipantsRemoved = 0;

  for (const event of events) {
    const contests = await prisma.contest.findMany({
      where: { eventId: event.id },
      select: { id: true, name: true },
    });

    const eventLineupCount = await prisma.lineup.count({ where: { eventId: event.id } });
    const eventParticipantCount = await prisma.eventParticipant.count({
      where: { eventId: event.id },
    });

    console.log(
      `[${dryRun ? "dry-run" : "cleanup"}] event ${event.externalId} (${event.id}): ` +
        `${contests.length} contest(s), ${eventLineupCount} lineup(s), ${eventParticipantCount} field row(s)`,
    );

    contestsRemoved += contests.length;
    lineupsRemoved += eventLineupCount;
    eventParticipantsRemoved += eventParticipantCount;

    if (dryRun) {
      continue;
    }

    for (const contest of contests) {
      await deleteContestGraph(contest.id, dryRun);
      console.log(`  removed contest: ${contest.name}`);
    }

    await prisma.lineup.deleteMany({ where: { eventId: event.id, contestId: null } });
    await prisma.eventParticipant.deleteMany({ where: { eventId: event.id } });
    await prisma.competitionEvent.delete({ where: { id: event.id } });
  }

  console.log(
    `\n[${dryRun ? "dry-run" : "cleanup"}] summary: ${events.length} event(s), ` +
      `${contestsRemoved} contest(s), ${lineupsRemoved} lineup(s), ` +
      `${eventParticipantsRemoved} EventParticipant row(s)`,
  );
  console.log(`[${dryRun ? "dry-run" : "cleanup"}] kept ${catalogCount} Participant catalog row(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
