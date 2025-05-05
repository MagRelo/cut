import { prisma } from '../src/lib/prisma.js';
import { writeFileSync } from 'fs';

async function exportTournamentPlayersCSV() {
  const rows = await prisma.$queryRaw<any[]>`\
    SELECT
      "Player"."pga_displayName" AS "displayName",
      "TournamentPlayer"."leaderboardPosition",
      "TournamentPlayer"."total",
      "TournamentPlayer"."cut",
      "TournamentPlayer"."bonus"
    FROM "TournamentPlayer"
    JOIN "Player" ON "Player"."id" = "TournamentPlayer"."playerId"\
  `;

  const csv = [
    'displayName,leaderboardPosition,total,cut,bonus',
    ...rows.map((r: any) =>
      [
        r.displayName ?? '',
        r.leaderboardPosition ?? '',
        r.total ?? '',
        r.cut ?? '',
        r.bonus ?? '',
      ].join(',')
    ),
  ].join('\n');

  writeFileSync('tournament_players.csv', csv);
  console.log('Exported tournament_players.csv');
  await prisma.$disconnect();
}

exportTournamentPlayersCSV().catch((e) => {
  console.error(e);
  process.exit(1);
});
