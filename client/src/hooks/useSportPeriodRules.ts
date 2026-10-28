import type { PeriodRules } from "@cut/sport-sdk";
import { useSportsQuery } from "./useSportData";
import { periodRulesForSport } from "../sports/eventPresentation";

export function useSportPeriodRules(sportId: string | undefined): PeriodRules | null {
  const { data: sports = [] } = useSportsQuery();
  const sport = sports.find((entry) => entry.id === sportId);
  if (sport?.periodRules !== undefined) {
    return sport.periodRules;
  }
  return periodRulesForSport(sportId);
}
