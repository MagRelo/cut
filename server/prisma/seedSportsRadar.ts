import { PrismaClient, Prisma } from '@prisma/client';
import {
  PlayerSeedService,
  TournamentSeedService,
} from '../src/services/tournamentSeedService.js';

import { fetchPGATourPlayers } from '../src/lib/pgaPlayers.js';

import { getTournamentField } from '../src/lib/sportsRadar/sportsRadar.js';

const prisma = new PrismaClient();
async function main() {
  try {
    console.log('Starting SportsRadar database seeding...');

    // refresh tournament schedule
    const tournamentSeedService = new TournamentSeedService();
    const tournaments = await tournamentSeedService.seedTournamentData();

    // refresh players
    const playerSeedService = new PlayerSeedService();
    await playerSeedService.seedPlayerData();

    // select a tournament using the tournament name
    const tournamentName = 'RBC Heritage';
    const tournament = tournaments.find(
      (tournament) => tournament.name === tournamentName
    );
    // updat tournament to set manualActive to true
    await prisma.tournament.update({
      where: {
        id: tournament?.id,
      },
      data: {
        manualActive: true,
      },
    });

    if (tournament) {
      // sleep for 20 seconds
      console.log('Sleeping for 10 seconds...' + new Date().toISOString());
      await new Promise((resolve) => setTimeout(resolve, 10000));
      console.log('Awake...' + new Date().toISOString());

      // update players in field
      const tournamentField = await getTournamentField(
        tournament.sportsRadarId
      );
      await prisma.player.updateMany({
        where: {
          sportsRadarId: {
            in: tournamentField.map((player) => player.id),
          },
        },
        data: {
          inField: true,
        },
      });

      // update players with pgaData - do not fail if they are not found and or/error
      const pgaData = await fetchPGATourPlayers();

      // Function to normalize names for comparison
      function normalizeName(name: string): string {
        return name.toLowerCase().replace(/[^a-z]/g, '');
      }

      // Function to match and update players with PGA Tour data
      async function matchAndUpdatePlayers(
        pgaPlayers: any[],
        dbPlayers: any[]
      ) {
        for (const pgaPlayer of pgaPlayers) {
          // Create different name combinations for matching
          const pgaFullName = normalizeName(
            `${pgaPlayer.firstName}${pgaPlayer.lastName}`
          );
          const pgaDisplayName = normalizeName(pgaPlayer.displayName);
          const pgaShortName = normalizeName(pgaPlayer.shortName);

          // Try to find a matching player in our database
          const matchedPlayer = dbPlayers.find((dbPlayer) => {
            if (!dbPlayer.first_name || !dbPlayer.last_name) return false;

            const dbFullName = normalizeName(
              `${dbPlayer.first_name}${dbPlayer.last_name}`
            );
            const dbName = dbPlayer.name ? normalizeName(dbPlayer.name) : '';

            return (
              dbFullName === pgaFullName ||
              dbName === pgaDisplayName ||
              dbName === pgaShortName
            );
          });

          if (matchedPlayer) {
            // Update the matched player with PGA Tour data
            await prisma.player.update({
              where: { id: matchedPlayer.id },
              data: {
                pga_pgaTourId: pgaPlayer.id,
                pga_imageUrl: pgaPlayer.headshot,
                pga_displayName: pgaPlayer.displayName,
              },
            });
          }
        }
      }

      // Get all players that are in the tournament field
      const dbPlayers = await prisma.player.findMany();

      // Match and update players
      await matchAndUpdatePlayers(pgaData, dbPlayers);

      // now we can update the player with the pgaData
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
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
