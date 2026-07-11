import type { PeriodRules } from "@cut/sport-sdk";
import { formatPeriodLabel } from "@cut/sport-sdk";

export type PeriodProgressState = "complete" | "active" | "upcoming";

export interface PeriodProgressChip {
  label: string;
  state: PeriodProgressState;
}

const PLAYOFF_PERIOD_THRESHOLD = 401;

function isPlayoff(
  currentPeriod: number | null | undefined,
  periodDisplay: string | null | undefined,
): boolean {
  if (periodDisplay?.trim().toLowerCase() === "playoff") return true;
  return typeof currentPeriod === "number" && currentPeriod >= PLAYOFF_PERIOD_THRESHOLD;
}

/** Prefer numeric currentPeriod; fall back to matching periodDisplay against labels / trailing digits. */
export function resolvePeriodNumber(
  rules: PeriodRules,
  currentPeriod: number | null | undefined,
  periodDisplay?: string | null,
): number | null {
  if (typeof currentPeriod === "number" && Number.isFinite(currentPeriod)) {
    const n = Math.round(currentPeriod);
    if (n >= 1) return n;
  }

  const display = periodDisplay?.trim();
  if (!display) return null;

  const labels = rules.labels;
  if (labels?.length) {
    const idx = labels.findIndex((label) => label.toLowerCase() === display.toLowerCase());
    if (idx >= 0) return idx + 1;
  }

  const digitMatch = /(\d+)\s*$/.exec(display);
  if (digitMatch) {
    const n = Number(digitMatch[1]);
    if (n >= 1 && (rules.count <= 0 || n <= rules.count)) return n;
  }

  return null;
}

/**
 * Derive period progress chips for ACTIVE/LOCKED contest status bars.
 * Returns [] when there are no multi-period rules to display.
 */
export function derivePeriodProgress(
  rules: PeriodRules | null | undefined,
  currentPeriod: number | null | undefined,
  periodStatusDisplay?: string | null,
  periodDisplay?: string | null,
): PeriodProgressChip[] {
  if (!rules || rules.count <= 0) return [];

  const playoff = isPlayoff(currentPeriod, periodDisplay);
  const resolvedPeriod = playoff ? null : resolvePeriodNumber(rules, currentPeriod, periodDisplay);
  const statusComplete = periodStatusDisplay?.trim() === "Complete";
  const chips: PeriodProgressChip[] = [];

  for (let i = 1; i <= rules.count; i++) {
    const label = formatPeriodLabel(rules, i);

    if (playoff) {
      chips.push({ label, state: "complete" });
      continue;
    }

    if (resolvedPeriod == null || resolvedPeriod < 1) {
      chips.push({ label, state: "upcoming" });
      continue;
    }

    if (i < resolvedPeriod || (i === resolvedPeriod && statusComplete)) {
      chips.push({ label, state: "complete" });
    } else if (i === resolvedPeriod) {
      chips.push({ label, state: "active" });
    } else {
      chips.push({ label, state: "upcoming" });
    }
  }

  if (playoff) {
    chips.push({ label: "Playoff", state: "active" });
  }

  return chips;
}
