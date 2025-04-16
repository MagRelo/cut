import { PrismaClient, Prisma } from '@prisma/client';
import {
  PlayerSeedService,
  TournamentSeedService,
} from '../src/services/tournamentSeedService.js';

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
