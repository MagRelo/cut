import { f1PredictionValue, F1_SPORT_ID } from "@cut/sport-f1";
import { golfPredictionValue, PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import {
  randomWinningScorePrediction,
  WINNING_SCORE_PREDICTION_MAX,
  WINNING_SCORE_PREDICTION_MIN,
} from "./winningScorePrediction.js";

export const F1_LINEUP_POINTS_PREDICTION_MIN = 1;
export const F1_LINEUP_POINTS_PREDICTION_MAX = 120;
export const F1_LINEUP_POINTS_RANDOM_MIN = 45;
export const F1_LINEUP_POINTS_RANDOM_MAX = 75;

export function randomF1LineupPointsPrediction(): number {
  const span = F1_LINEUP_POINTS_RANDOM_MAX - F1_LINEUP_POINTS_RANDOM_MIN + 1;
  return F1_LINEUP_POINTS_RANDOM_MIN + Math.floor(Math.random() * span);
}

export function predictionValueForSport(sportId: string, prediction: unknown): number | null {
  if (sportId === F1_SPORT_ID) {
    return f1PredictionValue(prediction);
  }
  return golfPredictionValue(prediction);
}

/** Parse numeric tie-break from any supported prediction shape. */
export function predictionNumericValue(prediction: unknown): number | null {
  return f1PredictionValue(prediction) ?? golfPredictionValue(prediction);
}

export function defaultPredictionForSport(sportId: string): object {
  if (sportId === F1_SPORT_ID) {
    return { type: "winningLineupPoints", value: randomF1LineupPointsPrediction() };
  }
  return { type: "winningScore", value: randomWinningScorePrediction() };
}

export function toPredictionForSport(
  sportId: string,
  value: number | null | undefined,
): unknown {
  if (value == null) return null;
  if (sportId === F1_SPORT_ID) {
    return { type: "winningLineupPoints", value };
  }
  return { type: "winningScore", value };
}

export function isValidPredictionForSport(sportId: string, value: unknown): value is number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return false;
  }
  if (sportId === F1_SPORT_ID) {
    return value >= F1_LINEUP_POINTS_PREDICTION_MIN && value <= F1_LINEUP_POINTS_PREDICTION_MAX;
  }
  return value >= WINNING_SCORE_PREDICTION_MIN && value <= WINNING_SCORE_PREDICTION_MAX;
}

export function defaultPredictionMidpoint(sportId: string): number {
  if (sportId === F1_SPORT_ID) {
    return 60;
  }
  return 120;
}

export function defaultPredictionForLineupId(sportId: string, lineupId: string): number {
  let hash = 0;
  for (let i = 0; i < lineupId.length; i++) {
    hash = (hash * 31 + lineupId.charCodeAt(i)) | 0;
  }

  if (sportId === F1_SPORT_ID) {
    const span = F1_LINEUP_POINTS_RANDOM_MAX - F1_LINEUP_POINTS_RANDOM_MIN + 1;
    return F1_LINEUP_POINTS_RANDOM_MIN + (Math.abs(hash) % span);
  }

  const span = 145 - 95 + 1;
  return 95 + (Math.abs(hash) % span);
}

export { F1_SPORT_ID, PGA_GOLF_SPORT_ID };
