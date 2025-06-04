import { prisma } from '../src/lib/prisma.js';

async function cleanTeamPlayers() {
  try {
    console.log('Starting team player cleanup...');

    // Get the active tournament
    const activeTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!activeTournament) {
      console.error('No active tournament found');
      process.exit(1);
    }

    console.log(`Active tournament: ${activeTournament.name}`);

    // Get all teams with their players
    const teams = await prisma.team.findMany({
      include: {
        TeamPlayer: {
          include: {
            Player: true,
          },
        },
      },
    });

    console.log(`Found ${teams.length} teams to process`);

    // Process each team
    for (const team of teams) {
      const playersToRemove = team.TeamPlayer.filter(
        (tp) => !tp.Player.inField
      );

      if (playersToRemove.length > 0) {
        console.log(
          `Team "${team.name}" has ${playersToRemove.length} players not in the field:`
        );
        playersToRemove.forEach((tp) => {
          console.log(
            `- ${tp.Player.pga_firstName} ${tp.Player.pga_lastName} (${tp.Player.pga_pgaTourId})`
          );
        });

        // Remove the players from the team
        await prisma.teamPlayer.deleteMany({
          where: {
            id: {
              in: playersToRemove.map((tp) => tp.id),
            },
          },
        });

        console.log(
          `Removed ${playersToRemove.length} players from team "${team.name}"`
        );
      }
    }

    console.log('Team player cleanup completed successfully');
  } catch (error) {
    console.error('Error during team player cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanTeamPlayers();
