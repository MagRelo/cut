/** Pure F1 live-score transforms (OpenF1 position / session_result → scoreData + total). */

import type { F1DriverStatus, F1ScoreData } from "./metadata.js";

/** Standard F1 race finish points (positions 1–10). */
export const F1_FINISH_POINTS: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

export function pointsForFinishPosition(position: number): number {
  if (!Number.isFinite(position) || position < 1) {
    return 0;
  }
  return F1_FINISH_POINTS[position] ?? 0;
}

export interface F1PositionInput {
  driverNumber: number;
  position: number;
  lapsCompleted?: number | null;
}

export interface F1SessionResultInput {
  position: number;
  driverNumber: number;
  points: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  numberOfLaps?: number | null;
  /** When known from session_result or separate fastest-lap feed */
  fastestLap?: boolean;
}

export interface F1ParticipantScoreUpdate {
  total: number;
  scoreData: F1ScoreData;
}

function driverStatusFromResult(result: F1SessionResultInput): F1DriverStatus {
  if (result.dns) return "dns";
  if (result.dsq) return "dsq";
  if (result.dnf) return "dnf";
  return "finished";
}

export function transformProvisionalPosition(input: F1PositionInput): F1ParticipantScoreUpdate {
  const finishPoints = pointsForFinishPosition(input.position);

  return {
    total: finishPoints,
    scoreData: {
      position: input.position,
      status: "running",
      finishPoints,
      bonusPoints: 0,
      fastestLap: false,
      provisional: true,
      lapsCompleted: input.lapsCompleted ?? null,
    },
  };
}

export function transformSessionResult(result: F1SessionResultInput): F1ParticipantScoreUpdate {
  const status = driverStatusFromResult(result);

  if (status === "dns" || status === "dsq" || status === "dnf") {
    return {
      total: 0,
      scoreData: {
        position: result.position > 0 ? result.position : null,
        status,
        finishPoints: 0,
        bonusPoints: 0,
        fastestLap: false,
        provisional: false,
        lapsCompleted: result.numberOfLaps ?? null,
      },
    };
  }

  const finishPoints = pointsForFinishPosition(result.position);
  const bonusPoints = Math.max(0, result.points - finishPoints);

  return {
    total: result.points,
    scoreData: {
      position: result.position,
      status,
      finishPoints,
      bonusPoints,
      fastestLap: result.fastestLap ?? bonusPoints > 0,
      provisional: false,
      lapsCompleted: result.numberOfLaps ?? null,
    },
  };
}
