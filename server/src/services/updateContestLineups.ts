// this service will run periodcally to keep the tournament up to date

import { prisma } from '../lib/prisma.js';

export async function updateContestLineups() {
  try {
    const currentTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!currentTournament) {
      console.error('No current tournament found');
      return;
    }

    // Get all contest lineups for this tournament
    const contestLineups = await prisma.contestLineup.findMany({
      where: {
        contest: {
          tournamentId: currentTournament.id,
        },
      },
      include: {
        tournamentLineup: {
          include: {
            players: {
              include: {
                tournamentPlayer: true,
              },
            },
          },
        },
      },
    });
    console.log(
      `- Updating scores for ${contestLineups.length} contest lineups`
    );

    // update ContestLineup score
    const updateContestScorePromises = contestLineups.map(
      async (contestLineup) => {
        const totalScore = contestLineup.tournamentLineup.players.reduce(
          (sum, lineupPlayer) => {
            const player = lineupPlayer.tournamentPlayer;
            return (
              sum +
              (player.total || 0) +
              (player.cut || 0) +
              (player.bonus || 0)
            );
          },
          0
        );
        return prisma.contestLineup.update({
          where: {
            id: contestLineup.id,
          },
          data: {
            score: totalScore,
          },
        });
      }
    );
    await Promise.all(updateContestScorePromises);
    console.log(`- Updated contest lineup scores`);

    // update contest lineup positions
    const contestLineupsByContest = contestLineups.reduce((acc, lineup) => {
      const contestId = lineup.contestId;
      if (!acc[contestId]) {
        acc[contestId] = [];
      }
      acc[contestId].push(lineup);
      return acc;
    }, {} as Record<string, typeof contestLineups>);

    // update ContestLineup position
    const positionUpdatePromises = Object.entries(contestLineupsByContest).map(
      async ([contestId, lineups]) => {
        // Sort lineups by score in descending order
        const sortedLineups = [...lineups].sort((a, b) => {
          const scoreA = a.score ?? 0;
          const scoreB = b.score ?? 0;
          return scoreB - scoreA;
        });

        // Update positions
        const positionUpdates = sortedLineups.map((lineup, index) => {
          return prisma.contestLineup.update({
            where: { id: lineup.id },
            data: { position: index + 1 },
          });
        });

        return Promise.all(positionUpdates);
      }
    );
    await Promise.all(positionUpdatePromises);
    console.log(`- Updated contest lineup positions`);

    console.log(`Updated tournament data for '${currentTournament.name}'.`);
  } catch (error) {
    console.error('Error in updateTournamentPlayerScores:', error);
    throw error;
  }
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  updateContestLineups()
    .then(() => {
      console.log('ContestLineups update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('ContestLineups update failed:', error);
      process.exit(1);
    });
}
