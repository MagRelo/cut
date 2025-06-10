import { PrismaClient } from '@prisma/client';
import { fetchPgaSchedule } from '../src/lib/pgaSchedule.js';
import { fetchPGATourPlayers } from '../src/lib/pgaPlayers.js';
import { getActivePlayers } from '../src/lib/pgaField.js';
import { getTournament } from '../src/lib/pgaTournament.js';

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
    const selectedTournament = await prisma.tournament.findFirst();
    if (!selectedTournament) {
      throw new Error('No tournaments found in DB.');
    }

    // update the tournament to "manualActive"
    await prisma.tournament.update({
      where: { id: selectedTournament.id },
      data: { manualActive: true },
    });

    // Get tournament data from PGA API
    const tournamentData = await getTournament(selectedTournament.pgaTourId);

    // Update tournament with latest leaderboard data
    await prisma.tournament.update({
      where: { id: selectedTournament.id },
      data: {
        status: tournamentData.tournamentStatus,
        roundStatusDisplay: tournamentData.roundStatusDisplay,
        roundDisplay: tournamentData.roundDisplay,
        currentRound: tournamentData.currentRound,
        weather: tournamentData.weather as any,
        beautyImage: tournamentData.beautyImage,
        course: tournamentData.courses[0].courseName,
        city: tournamentData.city,
        state: tournamentData.state,
        timezone: tournamentData.timezone,
      },
    });

    // Update player field status
    const fieldData = await getActivePlayers(selectedTournament.pgaTourId);
    const fieldPlayerIds = fieldData.players.map((p) => p.id);

    // Update inField status for players in the field
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      data: { inField: true },
    });
    console.log(
      `Updated inField status for ${fieldPlayerIds.length} players in '${selectedTournament.name}'.`
    );

    // Set inField to false for all others
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { notIn: fieldPlayerIds } },
      data: { inField: false },
    });
    console.log('Set inField to false for all other players.');

    // 4. Create TournamentPlayer records for all players in the field
    const playersInField = await prisma.player.findMany({
      where: { inField: true },
    });

    for (const player of playersInField) {
      await prisma.tournamentPlayer.upsert({
        where: {
          tournamentId_playerId: {
            tournamentId: selectedTournament.id,
            playerId: player.id,
          },
        },
        create: {
          tournamentId: selectedTournament.id,
          playerId: player.id,
        },
        update: {}, // No updates needed if record exists
      });
    }
    console.log(
      `Created TournamentPlayer records for ${playersInField.length} players in the field.`
    );

    // 5. Create a default user group for testing
    const defaultUserGroup = await prisma.userGroup.create({
      data: {
        name: 'PGA Tour Default',
        description: 'Default user group for PGA Tour data',
      },
    });
    console.log('Created default user group');

    // 6. Create two test contests - one with user group and one without
    const contestWithGroup = await prisma.contest.create({
      data: {
        name: 'Group Contest',
        description: 'A contest with a user group',
        tournamentId: selectedTournament.id,
        userGroupId: defaultUserGroup.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'ACTIVE',
        settings: {
          maxPlayers: 4,
          scoringType: 'STABLEFORD',
        },
      },
    });
    console.log('Created contest with user group');

    const contestWithoutGroup = await prisma.contest.create({
      data: {
        name: 'Open Contest',
        description: 'A contest without a user group',
        tournamentId: selectedTournament.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'ACTIVE',
        settings: {
          maxPlayers: 4,
          scoringType: 'STABLEFORD',
        },
      },
    });
    console.log('Created contest without user group');
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
