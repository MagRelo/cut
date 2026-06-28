import { F1_SPORT_ID } from "@cut/sport-f1";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { f1PredictionValue, toF1Prediction, F1_PREDICTION_MAX, F1_PREDICTION_MIN } from "./f1Prediction";
import { golfPredictionValue, toGolfPrediction } from "./golfPrediction";
import {
  defaultWinningScorePredictionForLineup,
  WINNING_SCORE_PREDICTION_MAX,
  WINNING_SCORE_PREDICTION_MIN,
} from "../utils/winningScorePrediction";

export const F1_LINEUP_POINTS_RANDOM_MIN = 45;
export const F1_LINEUP_POINTS_RANDOM_MAX = 75;

export function predictionValueForSport(sportId: string, prediction: unknown): number | null {
  if (sportId === F1_SPORT_ID) {
    return f1PredictionValue(prediction);
  }
  return golfPredictionValue(prediction);
}

export function predictionNumericValue(prediction: unknown): number | null {
  return f1PredictionValue(prediction) ?? golfPredictionValue(prediction);
}

export function toPredictionForSport(
  sportId: string,
  value: number | null | undefined,
): unknown {
  if (value == null) return null;
  if (sportId === F1_SPORT_ID) {
    return toF1Prediction(value);
  }
  return toGolfPrediction(value);
}

export function defaultPredictionMidpoint(sportId: string): number {
  return sportId === F1_SPORT_ID ? 60 : 120;
}

export function defaultPredictionForLineupId(sportId: string, lineupId: string): number {
  if (sportId === F1_SPORT_ID) {
    let hash = 0;
    for (let i = 0; i < lineupId.length; i++) {
      hash = (hash * 31 + lineupId.charCodeAt(i)) | 0;
    }
    const span = F1_LINEUP_POINTS_RANDOM_MAX - F1_LINEUP_POINTS_RANDOM_MIN + 1;
    return F1_LINEUP_POINTS_RANDOM_MIN + (Math.abs(hash) % span);
  }
  return defaultWinningScorePredictionForLineup(lineupId);
}

export function predictionRangeForSport(sportId: string): { min: number; max: number } {
  if (sportId === F1_SPORT_ID) {
    return { min: F1_PREDICTION_MIN, max: F1_PREDICTION_MAX };
  }
  return { min: WINNING_SCORE_PREDICTION_MIN, max: WINNING_SCORE_PREDICTION_MAX };
}

export { F1_SPORT_ID, PGA_GOLF_SPORT_ID };
