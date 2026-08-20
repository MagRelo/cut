import type { Candidate, EventStatus } from "./types.js";

export type SortDirection = "asc" | "desc";

export interface CandidateSortKeyDef {
  key: string;
  direction: SortDirection;
}

/** Named sort contexts used by platform surfaces */
export type CandidateSortContext =
  | "fieldLeaderboard"
  | "lineupPicks"
  | "picker";

export type CandidateSortContextDef =
  | CandidateSortKeyDef[]
  | {
      scheduled: CandidateSortKeyDef[];
      active: CandidateSortKeyDef[];
    };

export interface CandidateSortConfig {
  contexts: Record<CandidateSortContext, CandidateSortContextDef>;
  filter?: (candidate: Candidate) => boolean;
  /** Fill empty `sortKeys` (lineup-pick candidates) from nested metadata. */
  buildSortKeys?: (candidate: Candidate) => Record<string, number | string>;
}

export interface SortCandidatesOptions {
  eventStatus?: EventStatus;
}

function sortKeyDefsForContext(
  contextDef: CandidateSortContextDef,
  context: CandidateSortContext,
  eventStatus?: EventStatus,
): CandidateSortKeyDef[] {
  if (Array.isArray(contextDef)) {
    return contextDef;
  }

  if (context === "picker") {
    return contextDef.scheduled;
  }

  if (eventStatus === "SCHEDULED") {
    return contextDef.scheduled;
  }

  return contextDef.active;
}

function sortKeyValue(candidate: Candidate, key: string): number | string | undefined {
  const value = candidate.sortKeys[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  return value;
}

function compareSortKeyValue(
  aVal: number | string | undefined,
  bVal: number | string | undefined,
  direction: SortDirection,
): number {
  const aMissing = aVal === undefined;
  const bMissing = bVal === undefined;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (typeof aVal === "number" && typeof bVal === "number") {
    return direction === "asc" ? aVal - bVal : bVal - aVal;
  }

  if (typeof aVal === "number") return -1;
  if (typeof bVal === "number") return 1;

  const cmp = String(aVal).localeCompare(String(bVal));
  return direction === "asc" ? cmp : -cmp;
}

export function compareCandidates(
  a: Candidate,
  b: Candidate,
  keyDefs: CandidateSortKeyDef[],
): number {
  for (const { key, direction } of keyDefs) {
    const diff = compareSortKeyValue(sortKeyValue(a, key), sortKeyValue(b, key), direction);
    if (diff !== 0) return diff;
  }
  return 0;
}

function hydrateSortKeys(candidates: Candidate[], config: CandidateSortConfig): Candidate[] {
  if (!config.buildSortKeys) return candidates;
  return candidates.map((candidate) => {
    if (Object.keys(candidate.sortKeys).length > 0) return candidate;
    return { ...candidate, sortKeys: config.buildSortKeys!(candidate) };
  });
}

export function sortCandidates(
  candidates: Candidate[],
  config: CandidateSortConfig,
  context: CandidateSortContext,
  options?: SortCandidatesOptions,
): Candidate[] {
  const contextDef = config.contexts[context];
  const keyDefs = sortKeyDefsForContext(contextDef, context, options?.eventStatus);
  const hydrated = hydrateSortKeys(candidates, config);
  const filtered = config.filter ? hydrated.filter(config.filter) : hydrated;
  return [...filtered].sort((a, b) => compareCandidates(a, b, keyDefs));
}
