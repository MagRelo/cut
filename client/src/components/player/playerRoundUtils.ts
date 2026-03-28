import type { RoundData, TournamentPlayerData } from "../../types/player";

export function roundHasBeenPlayed(roundData: RoundData | undefined): boolean {
  if (!roundData) return false;
  const hasScores = roundData.holes?.scores?.some((score) => score !== null);
  const hasTotal = typeof roundData.total === "number" && roundData.total !== 0;
  const hasProgress = typeof roundData.ratio === "number" && roundData.ratio > 0;
  return hasScores || hasTotal || hasProgress;
}

export function getAvailableRounds(tournamentData: TournamentPlayerData): number[] {
  const rounds: number[] = [];
  for (let roundNum = 1; roundNum <= 4; roundNum++) {
    const roundKey = `r${roundNum}` as keyof Pick<TournamentPlayerData, "r1" | "r2" | "r3" | "r4">;
    const roundData = tournamentData[roundKey] as RoundData | undefined;
    if (!roundData) continue;
    const hasScores = roundData.holes?.scores?.some((score) => score !== null);
    const hasTotal = typeof roundData.total === "number" && roundData.total !== 0;
    const hasProgress = typeof roundData.ratio === "number" && roundData.ratio > 0;
    if (hasScores || hasTotal || hasProgress) {
      rounds.push(roundNum);
    }
  }
  return rounds;
}

/** Highest round number that has data; `1` if none (e.g. before scores exist). */
export function getDefaultScorecardRound(tournamentData: TournamentPlayerData): number {
  const available = getAvailableRounds(tournamentData);
  if (available.length === 0) return 1;
  return Math.max(...available);
}
