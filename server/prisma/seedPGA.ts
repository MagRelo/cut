import { PrismaClient } from '@prisma/client';
import { fetchPgaSchedule } from '../src/lib/pgaSchedule.js';
import { fetchPGATourPlayers } from '../src/lib/pgaPlayers.js';
import { getActivePlayers } from '../src/lib/pgaField.js';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting PGA Tour database seeding...');

    // 1. Fetch and upsert tournaments
    const tournaments = await fetchPgaSchedule();
    console.log(`Fetched ${tournaments.length} tournaments from PGA Tour API.`);

    for (const tournament of tournaments) {
      // Try to find existing tournament by pgaTourId
      let dbTournament = await prisma.tournament.findFirst({
        where: { pgaTourId: tournament.id },
      });
      if (dbTournament) {
        await prisma.tournament.update({
          where: { id: dbTournament.id },
          data: {
            name: tournament.tournamentName,
            // Set other fields to null or empty if not available
            // You may enhance this with more PGA data if available
          },
        });
      } else {
        await prisma.tournament.create({
          data: {
            pgaTourId: tournament.id,
            name: tournament.tournamentName,
            startDate: new Date(), // Placeholder, update if PGA data available
            endDate: new Date(), // Placeholder, update if PGA data available
            course: '', // Placeholder
            city: '', // Placeholder
            state: '', // Placeholder
            timezone: '', // Placeholder
            venue: undefined,
            purse: null,
            status: '',
            roundStatusDisplay: null,
            roundDisplay: null,
            currentRound: null,
            weather: undefined,
            beautyImage: null,
            cutLine: null,
            cutRound: null,
            manualActive: false,
          },
        });
      }
    }
    console.log('Tournaments upserted.');

    // 2. Fetch and upsert players
    const players = await fetchPGATourPlayers();
    console.log(`Fetched ${players.length} players from PGA Tour API.`);

    for (const player of players) {
      // Try to find existing player by pga_pgaTourId
      let dbPlayer = await prisma.player.findFirst({
        where: { pga_pgaTourId: player.id },
      });
      if (dbPlayer) {
        await prisma.player.update({
          where: { id: dbPlayer.id },
          data: {
            pga_displayName: player.displayName,
            pga_imageUrl: player.headshot,
            isActive: player.isActive,
            pga_firstName: player.firstName,
            pga_lastName: player.lastName,
            pga_shortName: player.shortName,
            pga_country: player.country,
            pga_countryFlag: player.countryFlag,
            pga_age: player.playerBio?.age ?? null,
            // Add more fields as needed
          },
        });
      } else {
        await prisma.player.create({
          data: {
            pga_pgaTourId: player.id,
            pga_displayName: player.displayName,
            pga_imageUrl: player.headshot,
            isActive: player.isActive,
            pga_firstName: player.firstName,
            pga_lastName: player.lastName,
            pga_shortName: player.shortName,
            pga_country: player.country,
            pga_countryFlag: player.countryFlag,
            pga_age: player.playerBio?.age ?? null,
            inField: false,
          },
        });
      }
    }
    console.log('Players upserted.');

    // 3. For a selected tournament, update inField for players in the field
    const selectedTournamentName = 'Truist Championship'; // Change as needed
    const selectedTournament = await prisma.tournament.findFirst({
      where: { name: selectedTournamentName },
    });
    if (!selectedTournament) {
      throw new Error(
        `Tournament '${selectedTournamentName}' not found in DB.`
      );
    }
    const fieldData = await getActivePlayers(selectedTournament.pgaTourId);
    const fieldPlayerIds = fieldData.players.map((p) => p.id);
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      data: { inField: true },
    });
    console.log(
      `Updated inField status for ${fieldPlayerIds.length} players in '${selectedTournamentName}'.`
    );

    // Optionally, set inField to false for all others
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { notIn: fieldPlayerIds } },
      data: { inField: false },
    });
    console.log('Set inField to false for all other players.');
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
