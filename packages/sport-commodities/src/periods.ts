import type { PeriodRules } from "@cut/sport-sdk";
import { COMMODITIES_ROUND_COUNT } from "./daily-scores.js";

export const COMMODITIES_PERIOD_RULES: PeriodRules = {
  count: COMMODITIES_ROUND_COUNT,
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  timelineTitle: "Week Timeline",
};
