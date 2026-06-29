import type { PredictionRules } from "@cut/sport-sdk";
import {
  defaultLineupPredictionForLineupId,
  defaultLineupPredictionMidpoint,
  isValidLineupPrediction,
  parseLineupPrediction,
  randomLineupPrediction,
  toLineupPrediction,
} from "@cut/sport-sdk";
import { prisma } from "../lib/prisma.js";

export function predictionNumericValue(prediction: unknown): number | null {
  return parseLineupPrediction(prediction);
}

export function predictionValueForSport(_sportId: string, prediction: unknown): number | null {
  return parseLineupPrediction(prediction);
}

export async function getPredictionRulesForSport(sportId: string): Promise<PredictionRules> {
  const sport = await prisma.sport.findUniqueOrThrow({
    where: { id: sportId },
    select: { predictionRules: true },
  });
  return sport.predictionRules as unknown as PredictionRules;
}

export async function defaultPredictionForSport(sportId: string): Promise<object> {
  const rules = await getPredictionRulesForSport(sportId);
  const prediction = toLineupPrediction(randomLineupPrediction(rules));
  if (!prediction) {
    throw new Error("Failed to build default lineup prediction");
  }
  return prediction;
}

export function toLineupPredictionValue(value: number | null | undefined) {
  return toLineupPrediction(value);
}

export function isValidPredictionValue(value: unknown, rules: PredictionRules): value is number {
  return isValidLineupPrediction(value, rules);
}

export function defaultPredictionMidpoint(rules: PredictionRules): number {
  return defaultLineupPredictionMidpoint(rules);
}

export function defaultPredictionForLineupId(lineupId: string, rules: PredictionRules): number {
  return defaultLineupPredictionForLineupId(lineupId, rules);
}
