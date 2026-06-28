import type { LineupEntryInput, RankedEntry } from "@cut/sport-sdk";
import { f1PredictionValue } from "./metadata.js";

export function getContestWinningScore(entries: { score: number | null }[]): number {
  return entries.reduce((max, entry) => Math.max(max, entry.score ?? 0), 0);
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

export function rankF1Entries(entries: LineupEntryInput[]): RankedEntry[] {
  const contestWinningScore = getContestWinningScore(entries);

  const sorted = [...entries].sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    const distA = tiebreakerDistance(f1PredictionValue(a.prediction), contestWinningScore);
    const distB = tiebreakerDistance(f1PredictionValue(b.prediction), contestWinningScore);
    if (distA !== distB) {
      return distA - distB;
    }

    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return sorted.map((entry, index) => ({
    entryId: entry.entryId,
    score: entry.score ?? 0,
    position: index + 1,
    predictionDistance: tiebreakerDistance(
      f1PredictionValue(entry.prediction),
      contestWinningScore,
    ),
    createdAt: entry.createdAt,
  }));
}
