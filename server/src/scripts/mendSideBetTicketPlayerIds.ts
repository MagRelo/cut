/**
 * Mend `SideBetTicket.playerIds` from the **current** fantasy lineup on each ticket's market.
 * Best-effort if users changed lineups after placing the bet.
 *
 * Run: pnpm --filter server exec tsx src/scripts/mendSideBetTicketPlayerIds.ts --dry-run
 * Run: pnpm --filter server exec tsx src/scripts/mendSideBetTicketPlayerIds.ts --apply
 * Optional: --tournamentId=<cuid>
 */

import { prisma } from "../lib/prisma.js";

function sortedPlayerIdsFromLineupPlayers(
  players: { tournamentPlayerId: string }[],
): string[] {
  return [...players.map((p) => p.tournamentPlayerId)].sort((a, b) => a.localeCompare(b));
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const apply = argv.includes("--apply");
  const tidArg = argv.find((a) => a.startsWith("--tournamentId="));
  const tournamentId = tidArg ? tidArg.split("=", 2)[1]!.trim() : undefined;
  return { dryRun, apply, tournamentId };
}

async function main() {
  const { dryRun, apply, tournamentId } = parseArgs();
  if (!dryRun && !apply) {
    console.error("Pass exactly one of: --dry-run | --apply");
    process.exit(1);
  }
  if (dryRun && apply) {
    console.error("Pass only one of --dry-run or --apply");
    process.exit(1);
  }

  const tickets = await prisma.sideBetTicket.findMany({
    where: {
      playerIds: { equals: [] },
      ...(tournamentId ? { sideBetMarket: { tournamentId } } : {}),
    },
    include: {
      sideBetMarket: {
        include: {
          tournamentLineup: { include: { players: true } },
        },
      },
    },
  });

  let updated = 0;
  let skipped = 0;
  let wouldUpdate = 0;
  for (const t of tickets) {
    const players = t.sideBetMarket.tournamentLineup.players;
    if (players.length !== 4) {
      console.log(`skip ticket ${t.id}: lineup has ${players.length} players (need 4)`);
      skipped++;
      continue;
    }
    const playerIds = sortedPlayerIdsFromLineupPlayers(players);
    const label = dryRun ? "[dry-run]" : "[apply]";
    console.log(`${label} ticket ${t.id} playerIds=[${playerIds.join(", ")}]`);
    if (apply) {
      await prisma.sideBetTicket.update({
        where: { id: t.id },
        data: { playerIds },
      });
      updated++;
    } else {
      wouldUpdate++;
    }
  }

  if (dryRun) {
    console.log(
      `Dry run complete. candidates=${tickets.length} wouldUpdate=${wouldUpdate} skipped=${skipped}`,
    );
  } else {
    console.log(`Apply complete. candidates=${tickets.length} updated=${updated} skipped=${skipped}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
