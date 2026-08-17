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

export type ResolveLineupPredictionResult =
  | { ok: true; prediction: object }
  | { ok: false; error: "invalid_prediction" };

/**
 * Canonical `{ type, value }` prediction for writes. Extra JSON keys are dropped.
 * When `prediction` is omitted/null, a sport default is used.
 */
export async function resolveLineupPredictionForWrite(
  sportId: string,
  prediction: unknown | undefined,
): Promise<ResolveLineupPredictionResult> {
  if (prediction === undefined || prediction === null) {
    return { ok: true, prediction: await defaultPredictionForSport(sportId) };
  }

  const value = parseLineupPrediction(prediction);
  const rules = await getPredictionRulesForSport(sportId);
  if (!isValidLineupPrediction(value, rules)) {
    return { ok: false, error: "invalid_prediction" };
  }
  const canonical = toLineupPrediction(value);
  if (!canonical) {
    return { ok: false, error: "invalid_prediction" };
  }
  return { ok: true, prediction: canonical };
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
