/** Completed-hole extraction and outsize-result helpers for contest feed stories. */

export type ContestFeedHoleLabel =
  | "hole_in_one"
  | "albatross_or_better"
  | "eagle"
  | "birdie"
  | "par"
  | "bogey"
  | "double_bogey_or_worse";

export interface ContestFeedCompletedHole {
  /** Stable key: `${round}:${hole}` (1-based hole number). */
  key: string;
  round: number;
  hole: number;
  par: number;
  strokes: number;
  strokesToPar: number;
  stableford: number;
  label: ContestFeedHoleLabel;
}

export interface ContestFeedPlayerHoleState {
  displayName: string;
  completedKeys: string[];
}

/** Fingerprint of completed holes for contest-owned golfers. */
export type ContestFeedHoleState = Record<string, ContestFeedPlayerHoleState>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function roundHoles(
  scoreData: unknown,
  round: number,
): Record<string, unknown> | null {
  const data = asRecord(scoreData);
  const roundData = asRecord(data?.[`r${round}`]);
  return asRecord(roundData?.holes);
}

export function holeKey(round: number, hole: number): string {
  return `${round}:${hole}`;
}

export function labelHoleOutcome(
  strokesToPar: number,
  strokes: number,
): ContestFeedHoleLabel {
  if (strokes === 1) return "hole_in_one";
  if (strokesToPar <= -3) return "albatross_or_better";
  if (strokesToPar === -2) return "eagle";
  if (strokesToPar === -1) return "birdie";
  if (strokesToPar === 0) return "par";
  if (strokesToPar === 1) return "bogey";
  return "double_bogey_or_worse";
}

/** Birdie-or-better or double-bogey-or-worse. */
export function isOutsizeHole(hole: Pick<ContestFeedCompletedHole, "strokesToPar">): boolean {
  return hole.strokesToPar <= -1 || hole.strokesToPar >= 2;
}

/**
 * Eagle-or-better, hole-in-one, or double-bogey-or-worse.
 * Plain birdies are outsize but not "rare" — they need contest impact to fire.
 */
export function isRareOutsizeHole(
  hole: Pick<ContestFeedCompletedHole, "strokesToPar" | "strokes">,
): boolean {
  return hole.strokes === 1 || hole.strokesToPar <= -2 || hole.strokesToPar >= 2;
}

/** Ranking weight for story priority (higher = more newsworthy). */
export function holeSeverity(
  hole: Pick<ContestFeedCompletedHole, "strokesToPar" | "strokes" | "label">,
): number {
  if (hole.strokes === 1 || hole.strokesToPar <= -3) return 40;
  if (hole.strokesToPar === -2) return 30;
  if (hole.strokesToPar >= 2) {
    return 25 + Math.min(10, hole.strokesToPar - 2);
  }
  if (hole.strokesToPar === -1) return 10;
  return 0;
}

/** All completed holes across rounds 1–4 from persisted scoreData. */
export function listCompletedHoles(scoreData: unknown): ContestFeedCompletedHole[] {
  const holes: ContestFeedCompletedHole[] = [];
  for (let round = 1; round <= 4; round++) {
    const roundData = roundHoles(scoreData, round);
    if (!roundData) continue;
    const pars = Array.isArray(roundData.par) ? roundData.par : [];
    const scores = Array.isArray(roundData.scores) ? roundData.scores : [];
    const stableford = Array.isArray(roundData.stableford) ? roundData.stableford : [];
    const length = Math.min(pars.length, scores.length, stableford.length);
    for (let index = 0; index < length; index++) {
      const par = pars[index];
      const strokes = scores[index];
      const points = stableford[index];
      if (
        typeof par !== "number" ||
        typeof strokes !== "number" ||
        typeof points !== "number" ||
        !Number.isFinite(par) ||
        !Number.isFinite(strokes) ||
        !Number.isFinite(points)
      ) {
        continue;
      }
      const hole = index + 1;
      const strokesToPar = strokes - par;
      holes.push({
        key: holeKey(round, hole),
        round,
        hole,
        par,
        strokes,
        strokesToPar,
        stableford: points,
        label: labelHoleOutcome(strokesToPar, strokes),
      });
    }
  }
  return holes;
}

/**
 * Newly completed holes for a player since the prior fingerprint.
 * Returns [] when the player has never been fingerprinted (seed-only).
 */
export function listNewCompletedHoles(
  scoreData: unknown,
  previous: ContestFeedPlayerHoleState | null | undefined,
): ContestFeedCompletedHole[] {
  const all = listCompletedHoles(scoreData);
  if (previous == null) return [];
  const prior = new Set(previous.completedKeys);
  return all.filter((hole) => !prior.has(hole.key));
}

export function listNewOutsizeHoles(
  scoreData: unknown,
  previous: ContestFeedPlayerHoleState | null | undefined,
): ContestFeedCompletedHole[] {
  return listNewCompletedHoles(scoreData, previous).filter(isOutsizeHole);
}

export interface ContestFeedHoleStatePlayerInput {
  eventParticipantId: string;
  displayName: string;
  scoreData: unknown;
}

/** Build the feed fingerprint written after each successful pass. */
export function buildContestFeedHoleState(
  players: readonly ContestFeedHoleStatePlayerInput[],
): ContestFeedHoleState {
  const state: ContestFeedHoleState = {};
  for (const player of players) {
    state[player.eventParticipantId] = {
      displayName: player.displayName,
      completedKeys: listCompletedHoles(player.scoreData).map((hole) => hole.key),
    };
  }
  return state;
}
