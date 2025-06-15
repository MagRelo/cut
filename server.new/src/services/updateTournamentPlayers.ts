// this service will run periodcally to keep the tournament player scores up to date

import { prisma } from '../lib/prisma.js';
import { fetchScorecard } from '../lib/pgaScorecard.js';
import { getPgaLeaderboard } from '../lib/pgaLeaderboard.js';

// Process players in batches to avoid overwhelming the API
const BATCH_SIZE = 10;
const BATCH_DELAY = 500; // 1 second delay between batches

async function processPlayerBatch(
  players: any[],
  currentTournament: any,
  leaderboardPlayers: any[]
) {
  const results = await Promise.all(
    players.map(async (tournamentPlayer) => {
      if (!tournamentPlayer.player.pga_pgaTourId) {
        console.warn(
          `- No PGA Tour ID found for player ${tournamentPlayer.player.id}`
        );
        return null;
      }

      const leaderboardPlayer = leaderboardPlayers.find(
        (lb) => lb.player.id === tournamentPlayer.player.pga_pgaTourId
      );

      if (!leaderboardPlayer) {
        console.warn(
          `- No leaderboard player found for player ${tournamentPlayer.player.pga_pgaTourId}`
        );
        return null;
      }

      try {
        // Fetch the player's scorecard
        const scorecard = await fetchScorecard(
          tournamentPlayer.player.pga_pgaTourId,
          currentTournament.pgaTourId
        );

        if (!scorecard) {
          console.warn(
            `- No scorecard found for player ${tournamentPlayer.player.pga_pgaTourId} in tournament ${currentTournament.pgaTourId}`
          );
          return null;
        }

        // Update the tournament player record
        await prisma.tournamentPlayer.update({
          where: {
            tournamentId_playerId: {
              tournamentId: currentTournament.id,
              playerId: tournamentPlayer.playerId,
            },
          },
          data: {
            cut: leaderboardPlayer.cutBonus,
            bonus: leaderboardPlayer.positionBonus,
            leaderboardPosition: leaderboardPlayer.position,
            leaderboardTotal: leaderboardPlayer.scoringData.total,
            total: scorecard.stablefordTotal,
            r1: scorecard.R1 || null,
            r2: scorecard.R2 || null,
            r3: scorecard.R3 || null,
            r4: scorecard.R4 || null,
          },
        });

        return tournamentPlayer.playerId;
      } catch (error) {
        console.error(
          `- Error updating score for player ${tournamentPlayer.playerId}:`,
          error
        );
        return null;
      }
    })
  );

  return results.filter((id): id is string => id !== null);
}

export async function updateTournamentPlayerScores() {
  try {
    const currentTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!currentTournament) {
      console.error(
        'updateTournamentPlayerScores: No current tournament found'
      );
      return;
    }

    // only update scores for players when roundStatusDisplay is "In Progress" or "Complete"
    if (
      currentTournament.roundStatusDisplay !== 'In Progress' &&
      currentTournament.roundStatusDisplay !== 'Complete'
    ) {
      console.log(
        `updateTournamentPlayerScores: Skipping score update. ${currentTournament.name}: ${currentTournament.roundStatusDisplay}`
      );
      return;
    }

    // Get all tournament players for this tournament
    const tournamentPlayers = await prisma.tournamentPlayer.findMany({
      where: { tournamentId: currentTournament.id },
      include: {
        player: true,
      },
    });

    console.log(
      `- updateTournamentPlayerScores: Found ${tournamentPlayers.length} tournament players.`
    );

    // Get the current leaderboard
    const { players: leaderboardPlayers } = await getPgaLeaderboard();

    // Process players in batches
    const updatedPlayerIds: string[] = [];
    for (let i = 0; i < tournamentPlayers.length; i += BATCH_SIZE) {
      const batch = tournamentPlayers.slice(i, i + BATCH_SIZE);
      console.log(
        `- Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(
          tournamentPlayers.length / BATCH_SIZE
        )}`
      );

      const batchResults = await processPlayerBatch(
        batch,
        currentTournament,
        leaderboardPlayers
      );
      updatedPlayerIds.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < tournamentPlayers.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log(
      `- updateTournamentPlayerScores: Updated scores for ${updatedPlayerIds.length} players in '${currentTournament.name}'.`
    );

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

    // update contest lineup scores
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

    // done
  } catch (error) {
    console.error('Error in updateTournamentPlayerScores:', error);
    throw error;
  }
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  updateTournamentPlayerScores()
    .then(() => {
      console.log('Tournament player scores update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tournament player scores update failed:', error);
      process.exit(1);
    });
}
