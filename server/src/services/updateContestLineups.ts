// this service will run periodcally to keep the tournament up to date

import { prisma } from "../lib/prisma.js";
import {
  computeSharePriceUsdFromSnapshot,
  fetchNetPosition,
  fetchSecondaryPoolSnapshot,
} from "../lib/secondarySharePrice.js";

export async function updateContestLineups() {
  try {
    const currentTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!currentTournament) {
      console.error("No current tournament found");
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
        contest: {
          select: {
            id: true,
            address: true,
            chainId: true,
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

    // update ContestLineup score
    const updateContestScorePromises = contestLineups.map(async (contestLineup: any) => {
      const totalScore = contestLineup.tournamentLineup.players.reduce(
        (sum: any, lineupPlayer: any) => {
          const player = lineupPlayer.tournamentPlayer;
          return sum + (player.total ?? 0);
        },
        0
      );

      // Update the in-memory object with the new score
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

    // update contest lineup positions
    const contestLineupsByContest = contestLineups.reduce((acc: any, lineup: any) => {
      const contestId = lineup.contestId;
      if (!acc[contestId]) {
        acc[contestId] = [];
      }
      acc[contestId].push(lineup);
      return acc;
    }, {} as Record<string, any>);

    // update ContestLineup position
    const positionUpdatePromises = Object.entries(contestLineupsByContest).map(
      async ([_contestId, lineups]: [string, any]) => {
        // Sort lineups by score in descending order
        const sortedLineups = [...lineups].sort((a: any, b: any) => {
          const scoreA = a.score ?? 0;
          const scoreB = b.score ?? 0;
          return scoreB - scoreA;
        });

        // Update positions with tie handling
        const positionUpdates: Promise<any>[] = [];
        let currentPosition = 1;
        let i = 0;

        while (i < sortedLineups.length) {
          const currentScore = sortedLineups[i].score ?? 0;
          const tiedLineups: any[] = [];

          // Collect all lineups with the same score
          while (i < sortedLineups.length && (sortedLineups[i].score ?? 0) === currentScore) {
            tiedLineups.push(sortedLineups[i]);
            i++;
          }

          // Assign the same position to all tied lineups
          for (const lineup of tiedLineups) {
            positionUpdates.push(
              prisma.contestLineup.update({
                where: { id: lineup.id },
                data: { position: currentPosition },
              })
            );
          }

          // Increment position by the number of tied players
          currentPosition += tiedLineups.length;
        }

        return Promise.all(positionUpdates);
      }
    );
    await Promise.all(positionUpdatePromises);

    // Save timeline snapshots for all contest lineups (include share price when chain + entryId allow)
    const currentRound = currentTournament.currentRound || 1;
    const timestamp = new Date();

    const poolSnapshotByContestId = new Map<string, Awaited<ReturnType<typeof fetchSecondaryPoolSnapshot>>>();
    const contestIdsUnique = [...new Set(contestLineups.map((cl: { contestId: string }) => cl.contestId))];
    for (const cid of contestIdsUnique) {
      const first = contestLineups.find((cl: { contestId: string }) => cl.contestId === cid) as
        | (typeof contestLineups)[number]
        | undefined;
      if (!first?.contest?.address) continue;
      try {
        const snap = await fetchSecondaryPoolSnapshot(
          first.contest.address as `0x${string}`,
          first.contest.chainId,
        );
        poolSnapshotByContestId.set(cid, snap);
      } catch (e) {
        console.warn(`[updateContestLineups] Could not read pool snapshot for contest ${cid}:`, e);
      }
    }

    const timelineSnapshots = await Promise.all(
      contestLineups.map(async (contestLineup: (typeof contestLineups)[number]) => {
        let sharePrice: number | null = null;
        const pool = poolSnapshotByContestId.get(contestLineup.contestId);
        const entryId = contestLineup.entryId;
        const addr = contestLineup.contest?.address;
        const chainId = contestLineup.contest?.chainId;
        if (pool && addr && chainId !== undefined && entryId) {
          try {
            const net = await fetchNetPosition(addr as `0x${string}`, chainId, entryId);
            sharePrice = computeSharePriceUsdFromSnapshot(pool, net);
          } catch (e) {
            console.warn(`[updateContestLineups] sharePrice skipped for lineup ${contestLineup.id}:`, e);
          }
        }

        return {
          contestLineupId: contestLineup.id,
          contestId: contestLineup.contestId,
          timestamp,
          roundNumber: currentRound,
          score: contestLineup.score || 0,
          position: contestLineup.position || 999,
          sharePrice,
        };
      }),
    );

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

// Main execution block
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
