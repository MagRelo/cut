import type { PredictionRules } from "@cut/sport-sdk";
import { useSportsQuery } from "./useSportData";

const DEFAULT_PREDICTION_RULES: PredictionRules = {
  min: 1,
  max: 250,
  defaultRandomMin: 95,
  defaultRandomMax: 145,
};

export function useSportPredictionRules(sportId: string | undefined): PredictionRules {
  const { data: sports = [] } = useSportsQuery();
  const sport = sports.find((entry) => entry.id === sportId);
  return sport?.predictionRules ?? DEFAULT_PREDICTION_RULES;
}
