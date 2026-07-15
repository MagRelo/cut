/** Golf remaining scoring capacity from persisted EventParticipant.scoreData. */

export const DEFAULT_MAX_PTS_PER_HOLE = 4;

export interface RemainingCapacity {
  holesLeft: number;
  maxRemaining: number;
  /** Round number whose holes were used (1–4), or null if none. */
  roundUsed: number | null;
}

export interface RemainingCapacityOptions {
  maxPtsPerHole?: number;
  currentPeriod?: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function holesLeftFromRound(round: unknown): number | null {
  const record = asRecord(round);
  if (!record) return null;
  const holes = asRecord(record.holes);
  if (!holes) return null;
  const stableford = holes.stableford;
  if (!Array.isArray(stableford) || stableford.length === 0) {
    return null;
  }
  return stableford.filter((s) => s === null || s === undefined).length;
}

function roundNumberFromRound(round: unknown): number | null {
  const record = asRecord(round);
  if (!record) return null;
  const holes = asRecord(record.holes);
  if (holes && typeof holes.round === "number") {
    return holes.round;
  }
  return null;
}

/**
 * Estimates how many stableford points a golfer can still add this event.
 * Prefers rCurrent, then the round matching currentPeriod, then r4.
 */
export function remainingCapacity(
  scoreData: unknown,
  options: RemainingCapacityOptions = {},
): RemainingCapacity {
  const maxPtsPerHole = options.maxPtsPerHole ?? DEFAULT_MAX_PTS_PER_HOLE;
  const empty: RemainingCapacity = {
    holesLeft: 0,
    maxRemaining: 0,
    roundUsed: null,
  };

  const data = asRecord(scoreData);
  if (!data) return empty;

  const position =
    typeof data.leaderboardPosition === "string" ? data.leaderboardPosition : null;
  if (position === "WD" || position === "CUT") {
    return empty;
  }

  const period = options.currentPeriod;
  const periodKey =
    typeof period === "number" && period >= 1 && period <= 4
      ? (`r${Math.round(period)}` as const)
      : null;

  const candidates: unknown[] = [
    data.rCurrent,
    periodKey ? data[periodKey] : null,
    data.r4,
    data.r3,
    data.r2,
    data.r1,
  ];

  for (const round of candidates) {
    const holesLeft = holesLeftFromRound(round);
    if (holesLeft === null) continue;
    return {
      holesLeft,
      maxRemaining: holesLeft * maxPtsPerHole,
      roundUsed: roundNumberFromRound(round),
    };
  }

  return empty;
}
