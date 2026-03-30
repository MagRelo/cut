import type { RoundData, TournamentPlayerData } from "../../types/player";

/** Same idea as `holesRemainingRatio` in `server/.../updateTournamentPlayers.ts`: played / total holes in the round. */
export function getRoundHoleProgress(roundData: RoundData | undefined): {
  played: number;
  total: number;
  remaining: number;
} | null {
  if (!roundData) return null;

  const holes = roundData.holes;
  if (holes) {
    const line =
      holes.stableford && holes.stableford.length > 0
        ? holes.stableford
        : holes.scores && holes.scores.length > 0
          ? holes.scores
          : [];
    if (line.length === 0) return null;
    const played = line.filter((s) => s !== null).length;
    const total = line.length;
    return { played, total, remaining: total - played };
  }

  // No hole array yet: approximate from ratio (fraction of round completed), same 18-hole basis as server PPH math.
  if (typeof roundData.ratio === "number" && roundData.ratio > 0) {
    const total = 18;
    const played = Math.min(total, Math.max(0, Math.round(roundData.ratio * total)));
    return { played, total, remaining: total - played };
  }

  return null;
}

/**
 * Stroke play for the selected round: Σ(score − par) over holes with a posted score.
 * Returns "E", "+2", "-3", etc. for use with "thru N".
 */
export function formatRoundStrokesVsPar(roundData: RoundData | undefined): string | null {
  const holes = roundData?.holes;
  if (!holes?.scores?.length || !holes.par?.length) return null;
  let vsPar = 0;
  let counted = false;
  const n = Math.min(holes.scores.length, holes.par.length);
  for (let i = 0; i < n; i++) {
    const s = holes.scores[i];
    const p = holes.par[i];
    if (s !== null && p != null) {
      vsPar += s - p;
      counted = true;
    }
  }
  if (!counted) return null;
  if (vsPar === 0) return "E";
  if (vsPar > 0) return `+${vsPar}`;
  return String(vsPar);
}

/** e.g. `"R2"` from `roundDisplay` like `"r2"` / `"R2"`. */
export function getRoundShortLabel(roundDisplay: string): string {
  const normalized = (roundDisplay || "r1").trim().toLowerCase();
  const m = /^r([1-4])$/.exec(normalized);
  return m ? `R${m[1]}` : "R1";
}

export function getRoundDataForDisplay(
  tournamentData: TournamentPlayerData | undefined,
  roundDisplay: string,
): RoundData | undefined {
  if (!tournamentData) return undefined;
  const normalized = (roundDisplay || "r1").trim().toLowerCase();
  const m = /^r([1-4])$/.exec(normalized);
  const key = (m ? `r${m[1]}` : "r1") as "r1" | "r2" | "r3" | "r4";
  return tournamentData[key];
}

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
