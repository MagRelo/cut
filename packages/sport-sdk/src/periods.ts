export interface PeriodRules {
  /** Scoring periods in the event. `0` = single continuous window (no chart dividers). */
  count: number;
  /** Short labels for periods 1..count (e.g. `R1`, `Mon`). */
  labels?: string[];
  /** Fallback when `labels` is omitted: `${labelPrefix}${n}`. */
  labelPrefix?: string;
  /** Timeline chart section title. */
  timelineTitle?: string;
}

export function formatPeriodLabel(
  rules: PeriodRules | null | undefined,
  periodNumber: number,
): string {
  if (periodNumber < 1) return `P${periodNumber}`;
  const labels = rules?.labels;
  if (labels?.[periodNumber - 1]) {
    return labels[periodNumber - 1]!;
  }
  if (rules?.labelPrefix) {
    return `${rules.labelPrefix}${periodNumber}`;
  }
  return `P${periodNumber}`;
}

/** Whether a snapshot period index should appear on the timeline chart. */
export function isTimelinePeriod(
  rules: PeriodRules | null | undefined,
  periodNumber: number | undefined,
): periodNumber is number {
  if (typeof periodNumber !== "number" || periodNumber < 1) {
    return false;
  }
  if (!rules || rules.count <= 0) {
    return true;
  }
  return periodNumber <= rules.count;
}

export function periodRulesHasDividers(rules: PeriodRules | null | undefined): boolean {
  return Boolean(rules && rules.count > 0);
}
