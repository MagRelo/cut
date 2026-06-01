import { prisma } from "../lib/prisma.js";
import { randomWinningScorePrediction } from "../utils/winningScorePrediction.js";

/**
 * Creates one empty TournamentLineup ("Lineup #1") per user who has none for this tournament.
 * Idempotent: safe to re-run on init.
 */
export async function bootstrapTournamentLineups(tournamentId: string): Promise<{
  created: number;
  skipped: number;
}> {
  const usersWithoutLineup = await prisma.user.findMany({
    where: {
      tournamentLineups: {
        none: { tournamentId },
      },
    },
    select: { id: true },
  });

  if (usersWithoutLineup.length === 0) {
    console.log(
      `[bootstrapTournamentLineups] All users already have a lineup for tournament ${tournamentId}`,
    );
    return { created: 0, skipped: 0 };
  }

  const result = await prisma.tournamentLineup.createMany({
    data: usersWithoutLineup.map((user) => ({
      userId: user.id,
      tournamentId,
      name: "Lineup #1",
      winningScorePrediction: randomWinningScorePrediction(),
    })),
  });

  console.log(
    `[bootstrapTournamentLineups] Created ${result.count} empty lineup(s) for tournament ${tournamentId}`,
  );

  return { created: result.count, skipped: usersWithoutLineup.length - result.count };
}
