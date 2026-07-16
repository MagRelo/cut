import type { PopularityMode, PopularityRules } from "./types.js";

export const DEFAULT_POPULARITY_STRENGTH = 1;
export const DEFAULT_POPULARITY_CAP = 2;
export const DEFAULT_POPULARITY_MODE: PopularityMode = "multiplicative";
export const DEFAULT_POPULARITY_MIN_ENTRY_FLOOR = 5;

export interface NormalizedPopularityRules {
  weight: number;
  strength: number;
  cap: number;
  mode: PopularityMode;
  minEntryFloor: number;
}

export interface PickPopularityEntry {
  pickRate: number;
  bonus: number;
  adjustedScore: number;
}

/** Per-player popularity map keyed by eventParticipantId. */
export type PickPopularityMap = Record<string, PickPopularityEntry>;

export function normalizePopularityRules(
  rules: PopularityRules | null | undefined,
): NormalizedPopularityRules {
  return {
    weight: rules?.weight ?? 0,
    strength: rules?.strength ?? DEFAULT_POPULARITY_STRENGTH,
    cap: rules?.cap ?? DEFAULT_POPULARITY_CAP,
    mode: rules?.mode ?? DEFAULT_POPULARITY_MODE,
    minEntryFloor: rules?.minEntryFloor ?? DEFAULT_POPULARITY_MIN_ENTRY_FLOOR,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sign(value: number): number {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

/**
 * Pick rates from locked lineup pick lists.
 * Returns null when total lineups is below minEntryFloor.
 */
export function computePickRates(
  lineupPickIdLists: readonly (readonly string[])[],
  minEntryFloor: number = DEFAULT_POPULARITY_MIN_ENTRY_FLOOR,
): Map<string, number> | null {
  const totalLineups = lineupPickIdLists.length;
  if (totalLineups < minEntryFloor) {
    return null;
  }

  const counts = new Map<string, number>();
  for (const picks of lineupPickIdLists) {
    const unique = new Set(picks);
    for (const epId of unique) {
      counts.set(epId, (counts.get(epId) ?? 0) + 1);
    }
  }

  const rates = new Map<string, number>();
  for (const [epId, count] of counts) {
    rates.set(epId, count / totalLineups);
  }
  return rates;
}

export interface AdjustedPickScore {
  bonus: number;
  adjustedScore: number;
}

/**
 * Bonus-only popularity adjustment per pick (consensus-axis.md).
 * When weight = 0 or e_i ≤ 0, returns unadjusted score with bonus 0.
 */
export function adjustPickScore(
  externalTotal: number,
  pickRate: number,
  rules: PopularityRules | NormalizedPopularityRules,
): AdjustedPickScore {
  const normalized = normalizePopularityRules(rules);
  const e = externalTotal;

  if (normalized.weight === 0 || e <= 0) {
    return { bonus: 0, adjustedScore: e };
  }

  const signal = 1 - 2 * pickRate;
  const rawW = clamp(
    normalized.weight * normalized.strength * signal,
    -normalized.cap,
    normalized.cap,
  );
  const wFloor = clamp(
    normalized.weight * normalized.strength * -sign(normalized.weight),
    -normalized.cap,
    normalized.cap,
  );
  const bonusWeight = rawW - wFloor;

  let adjusted: number;
  if (normalized.mode === "additive") {
    adjusted = e + bonusWeight;
  } else {
    adjusted = e * (1 + bonusWeight);
  }

  const adjustedScore = Math.round(adjusted);
  const bonus = adjustedScore - e;

  return { bonus: Math.max(0, bonus), adjustedScore };
}

/**
 * Build contest pickPopularity map from frozen pick rates and current external totals.
 * When weight is 0, returns null (omit field). When rates are null (below floor), returns null.
 */
export function buildPickPopularityMap(
  pickRates: Map<string, number> | null,
  totalsByEventParticipantId: Map<string, number>,
  rules: PopularityRules | NormalizedPopularityRules,
): PickPopularityMap | null {
  const normalized = normalizePopularityRules(rules);
  if (normalized.weight === 0 || pickRates === null || pickRates.size === 0) {
    return null;
  }

  const map: PickPopularityMap = {};
  for (const [epId, pickRate] of pickRates) {
    const e = totalsByEventParticipantId.get(epId) ?? 0;
    const { bonus, adjustedScore } = adjustPickScore(e, pickRate, normalized);
    map[epId] = { pickRate, bonus, adjustedScore };
  }
  return map;
}

/** Sum adjusted pick scores for a lineup; falls back to external totals when no map. */
export function sumLineupScores(
  eventParticipantIds: readonly string[],
  totalsByEventParticipantId: Map<string, number>,
  pickPopularity: PickPopularityMap | null,
): { baseScore: number; score: number; popularityBonus: number } {
  let baseScore = 0;
  let score = 0;

  for (const epId of eventParticipantIds) {
    const e = totalsByEventParticipantId.get(epId) ?? 0;
    baseScore += e;
    const entry = pickPopularity?.[epId];
    score += entry != null ? entry.adjustedScore : e;
  }

  return {
    baseScore,
    score,
    popularityBonus: score - baseScore,
  };
}
