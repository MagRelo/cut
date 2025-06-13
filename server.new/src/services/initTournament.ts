// this service will run periodcally to keep the tournament up to date

import { prisma } from '../lib/prisma.js';
import { getTournament } from '../lib/pgaTournament.js';
import { getActivePlayers } from '../lib/pgaField.js';
import { getPlayerProfileOverview } from '../lib/pgaPlayerProfile.js';

export async function initTournament(pgaTourId: string) {
  try {
    // get the tournament
    const tournament = await prisma.tournament.findFirst({
      where: { pgaTourId: pgaTourId },
    });

    if (!tournament) {
      console.error('Tournament not found');
      return;
    }

    // update tournament meta-data from PGA
    const tournamentData = await getTournament(pgaTourId);
    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        status: tournamentData.tournamentStatus,
        roundStatusDisplay: tournamentData.roundStatusDisplay,
        roundDisplay: tournamentData.roundDisplay,
        currentRound: tournamentData.currentRound,
        weather: tournamentData.weather as any,
        beautyImage: tournamentData.beautyImage,
        course: tournamentData.courses[0]?.courseName,
        city: tournamentData.city,
        state: tournamentData.state,
        timezone: tournamentData.timezone,
      },
    });
    console.log(`- initTournament: Updated tournament data.`);

    // Update inField status for players in the field
    const fieldData = await getActivePlayers(pgaTourId);
    const fieldPlayerIds = fieldData.players.map((p) => p.id);
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      data: { inField: true },
    });
    // set inField to false for all others
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { notIn: fieldPlayerIds } },
      data: { inField: false },
    });
    console.log(
      `- initTournament: Updated inField status for ${fieldPlayerIds.length} players.`
    );

    // Update players in the field with player profiles
    const playersInField = await prisma.player.findMany({
      where: { inField: true },
    });
    await Promise.all(
      playersInField.map(async (player) => {
        const playerProfile = await getPlayerProfileOverview(
          player.pga_pgaTourId || ''
        );
        if (playerProfile) {
          await prisma.player.update({
            where: { id: player.id },
            data: {
              pga_performance: {
                performance: playerProfile.performance,
                standings: playerProfile.standings,
              },
            },
          });
        }
      })
    );
    console.log(
      `- initTournament: Updated ${playersInField.length} player profiles.`
    );

    console.log(`initTournament: Completed '${tournament.name}'`);
  } catch (error) {
    console.error('Error in updateTournamentPlayerScores:', error);
    throw error;
  }
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  const pgaTourId = process.argv[2];
  if (!pgaTourId) {
    console.error('Please provide a PGA Tour ID as an argument');
    process.exit(1);
  }

  initTournament(pgaTourId)
    .then(() => {
      console.log('Tournament initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tournament initialization failed:', error);
      process.exit(1);
    });
}
