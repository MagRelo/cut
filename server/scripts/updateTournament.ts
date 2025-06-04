import { prisma } from '../src/lib/prisma.js';
import { getTournament } from '../src/lib/pgaTournament.js';
import { getActivePlayers } from '../src/lib/pgaField.js';

async function updateTournament(tournamentId: string) {
  try {
    console.log(`Starting tournament update for ID: ${tournamentId}`);

    // Get tournament from database
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new Error(`Tournament with ID ${tournamentId} not found`);
    }

    // Get tournament data from PGA API
    const tournamentData = await getTournament(tournament.pgaTourId);

    // Update tournament with latest leaderboard data
    await prisma.tournament.update({
      where: { id: tournament.id },
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

    console.log('Tournament data updated successfully');

    // Update inField status for players in the field
    const fieldData = await getActivePlayers(tournament.pgaTourId);
    const fieldPlayerIds = fieldData.players.map((p) => p.id);

    await prisma.player.updateMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      data: { inField: true },
    });
    console.log(
      `Updated inField status for ${fieldPlayerIds.length} players in '${tournament.name}'.`
    );

    // Set inField to false for all others
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { notIn: fieldPlayerIds } },
      data: { inField: false },
    });
    console.log('Set inField to false for all other players.');

    console.log('Tournament update completed successfully');
  } catch (error) {
    console.error('Error updating tournament:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get tournament ID from command line arguments
const tournamentId = process.argv[2] || 'cmafgmmbm0006c4byuqcbwpbt';

if (!tournamentId) {
  console.error('Please provide a tournament ID as a command line argument');
  process.exit(1);
}

updateTournament(tournamentId);
