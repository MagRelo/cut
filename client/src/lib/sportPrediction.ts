import type { PredictionRules } from "@cut/sport-sdk";
import {
  defaultLineupPredictionForLineupId,
  defaultLineupPredictionMidpoint,
  parseLineupPrediction,
  toLineupPrediction,
} from "@cut/sport-sdk";

export function predictionNumericValue(prediction: unknown): number | null {
  return parseLineupPrediction(prediction);
}

export function toLineupPredictionValue(value: number | null | undefined) {
  return toLineupPrediction(value);
}

export function defaultPredictionMidpoint(rules: PredictionRules): number {
  return defaultLineupPredictionMidpoint(rules);
}

export function defaultPredictionForLineupId(lineupId: string, rules: PredictionRules): number {
  return defaultLineupPredictionForLineupId(lineupId, rules);
}
