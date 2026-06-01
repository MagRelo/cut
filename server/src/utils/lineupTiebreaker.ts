export interface ContestLineupForRanking {
  score: number | null;
  createdAt: Date;
  tournamentLineup: {
    winningScorePrediction: number | null;
  };
}

export function getContestWinningScore(lineups: { score: number | null }[]): number {
  return lineups.reduce((max, lineup) => Math.max(max, lineup.score ?? 0), 0);
}

export function tiebreakerDistance(
  prediction: number | null | undefined,
  contestWinningScore: number,
): number {
  if (prediction == null) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(prediction - contestWinningScore);
}

export function compareContestLineupRank(
  a: ContestLineupForRanking,
  b: ContestLineupForRanking,
  contestWinningScore: number,
): number {
  const scoreA = a.score ?? 0;
  const scoreB = b.score ?? 0;
  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }

  const distA = tiebreakerDistance(a.tournamentLineup.winningScorePrediction, contestWinningScore);
  const distB = tiebreakerDistance(b.tournamentLineup.winningScorePrediction, contestWinningScore);
  if (distA !== distB) {
    return distA - distB;
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function sortContestLineups<T extends ContestLineupForRanking>(
  lineups: T[],
  contestWinningScore: number,
): T[] {
  return [...lineups].sort((a, b) => compareContestLineupRank(a, b, contestWinningScore));
}
