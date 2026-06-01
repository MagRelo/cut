// this service will run periodcally to keep the tournament up to date

import { prisma } from "../lib/prisma.js";
import { getContestWinningScore, sortContestLineups } from "../utils/lineupTiebreaker.js";

export async function updateContestLineups() {
  try {
    const currentTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!currentTournament) {
      console.error("No current tournament found");
      return;
    }

    const contestLineups = await prisma.contestLineup.findMany({
      where: {
        contest: {
          tournamentId: currentTournament.id,
        },
      },
      include: {
        contest: {
          select: {
            id: true,
          },
        },
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

    const updateContestScorePromises = contestLineups.map(async (contestLineup) => {
      const totalScore = contestLineup.tournamentLineup.players.reduce((sum, lineupPlayer) => {
        const player = lineupPlayer.tournamentPlayer;
        return sum + (player.total ?? 0);
      }, 0);

      contestLineup.score = totalScore;

      return prisma.contestLineup.update({
        where: {
          id: contestLineup.id,
        },
        data: {
          score: totalScore,
        },
      });
    });
    await Promise.all(updateContestScorePromises);

    const contestLineupsByContest = contestLineups.reduce(
      (acc, lineup) => {
        const contestId = lineup.contestId;
        if (!acc[contestId]) {
          acc[contestId] = [];
        }
        acc[contestId].push(lineup);
        return acc;
      },
      {} as Record<string, typeof contestLineups>,
    );

    const positionUpdatePromises = Object.values(contestLineupsByContest).map(async (lineups) => {
      const contestWinningScore = getContestWinningScore(lineups);
      const sortedLineups = sortContestLineups(lineups, contestWinningScore);

      return Promise.all(
        sortedLineups.map((lineup, index) =>
          prisma.contestLineup.update({
            where: { id: lineup.id },
            data: { position: index + 1 },
          }),
        ),
      );
    });
    await Promise.all(positionUpdatePromises);

    const currentRound = currentTournament.currentRound || 1;
    const timestamp = new Date();

    const timelineSnapshots = contestLineups.map((contestLineup) => ({
      contestLineupId: contestLineup.id,
      contestId: contestLineup.contestId,
      timestamp,
      roundNumber: currentRound,
      score: contestLineup.score || 0,
      position: contestLineup.position || 999,
      sharePrice: null,
    }));

    if (timelineSnapshots.length > 0) {
      await prisma.contestLineupTimeline.createMany({
        data: timelineSnapshots,
      });
    }
  } catch (error) {
    console.error("[CRON] Error in updateContestLineups:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateContestLineups()
    .then(() => {
      console.log("ContestLineups update completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("ContestLineups update failed:", error);
      process.exit(1);
    });
}
