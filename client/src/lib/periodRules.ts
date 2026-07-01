import type { PeriodRules } from "@cut/sport-sdk";
import { COMMODITIES_PERIOD_RULES } from "@cut/sport-commodities";
import { F1_PERIOD_RULES } from "@cut/sport-f1";
import { PGA_GOLF_PERIOD_RULES } from "@cut/sport-pga-golf";

const PERIOD_RULES_BY_SPORT: Record<string, PeriodRules> = {
  "pga-golf": PGA_GOLF_PERIOD_RULES,
  f1: F1_PERIOD_RULES,
  commodities: COMMODITIES_PERIOD_RULES,
};

export function getPeriodRulesForSport(sportId: string | undefined): PeriodRules | null {
  if (!sportId) return null;
  return PERIOD_RULES_BY_SPORT[sportId] ?? null;
}
