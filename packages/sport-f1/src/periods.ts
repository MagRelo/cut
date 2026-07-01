import type { PeriodRules } from "@cut/sport-sdk";

/** F1 contests score once per session — no multi-period timeline dividers. */
export const F1_PERIOD_RULES: PeriodRules = {
  count: 0,
  timelineTitle: "Race Timeline",
};
