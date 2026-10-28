import type { PredictionRules } from "@cut/sport-sdk";
import { useSportsQuery } from "./useSportData";

/** Slider bounds for a sport. Undefined until `GET /sports` includes that sport. */
export function useSportPredictionRules(sportId: string | undefined): PredictionRules | undefined {
  const { data: sports = [] } = useSportsQuery();
  if (!sportId) return undefined;
  return sports.find((entry) => entry.id === sportId)?.predictionRules;
}
