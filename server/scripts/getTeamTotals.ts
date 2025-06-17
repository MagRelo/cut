import { prisma } from '../src/lib/prisma';

async function getTeamTotals(tournamentId: string, leagueId: string) {
  try {
    // Get the league with all its teams and their players
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        leagueTeams: {
          include: {
            team: {
              include: {
                TeamPlayer: {
                  include: {
                    Player: {
                      include: {
                        tournamentPlayers: {
                          where: { tournamentId },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!league) {
      console.error('League not found');
      process.exit(1);
    }

    // Calculate and display team totals
    const teamTotals = league.leagueTeams.map((lt) => {
      const team = lt.team;
      const total = team.TeamPlayer.reduce((sum, tp) => {
        const tournamentPlayer = tp.Player.tournamentPlayers[0];
        if (!tournamentPlayer) {
          console.log('No tournament data found for player');
          return sum;
        }

        const playerTotal =
          (tournamentPlayer.total || 0) +
          (tournamentPlayer.cut || 0) +
          (tournamentPlayer.bonus || 0);

        return sum + playerTotal;
      }, 0);

      return {
        teamName: team.name,
        total,
      };
    });

    // Sort teams by total score (descending)
    teamTotals.sort((a, b) => b.total - a.total);

    // Display results
    console.log('\nTeam Totals:');
    console.log('------------');
    teamTotals.forEach((team, index) => {
      console.log(`${index + 1}. ${team.teamName}: ${team.total}`);
    });
  } catch (error) {
    console.error('Error getting team totals:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const tournamentId = process.argv[2];
const leagueId = process.argv[3];

if (!tournamentId || !leagueId) {
  console.error('Usage: npm run get-team-totals <tournamentId> <leagueId>');
  process.exit(1);
}

getTeamTotals(tournamentId, leagueId);
