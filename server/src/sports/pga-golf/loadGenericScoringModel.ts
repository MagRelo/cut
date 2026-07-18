import {
  buildGenericScoringModel,
  extractGenericHoleOutcomes,
  PGA_GOLF_SPORT_ID,
  type GenericScoringModel,
} from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";

export interface LoadedGenericScoringModel {
  model: GenericScoringModel;
  eventParticipantCount: number;
  holeSampleCount: number;
}

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 20;
const cache = new Map<
  string,
  { expiresAt: number; value: Promise<LoadedGenericScoringModel> }
>();

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function completedRoundsOnly(scoreData: unknown): Record<string, unknown> | null {
  const data = asRecord(scoreData);
  if (!data) return null;
  const completed: Record<string, unknown> = {};
  for (let round = 1; round <= 4; round++) {
    const key = `r${round}`;
    const roundData = asRecord(data[key]);
    const holes = asRecord(roundData?.holes);
    const pars = Array.isArray(holes?.par) ? holes.par : [];
    const scores = Array.isArray(holes?.scores) ? holes.scores : [];
    const stableford = Array.isArray(holes?.stableford)
      ? holes.stableford
      : [];
    if (
      pars.length >= 18 &&
      scores.length >= 18 &&
      stableford.length >= 18 &&
      [...pars.slice(0, 18), ...scores.slice(0, 18), ...stableford.slice(0, 18)].every(
        (value) => typeof value === "number" && Number.isFinite(value),
      )
    ) {
      completed[key] = roundData;
    }
  }
  return Object.keys(completed).length > 0 ? completed : null;
}

export function clearGenericGolfScoringModelCache(): void {
  cache.clear();
}

/**
 * Builds an anonymous field-wide scoring distribution from prior PGA events.
 * Current-event outcomes are excluded so a report stays stable as live holes arrive.
 */
export async function loadGenericGolfScoringModel(
  currentEventId: string,
  options: {
    cacheTtlMs?: number;
    now?: () => number;
    fetchScoreDataRows?: (eventId: string) => Promise<unknown[]>;
  } = {},
): Promise<LoadedGenericScoringModel> {
  const now = (options.now ?? Date.now)();
  const cached = cache.get(currentEventId);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = (async () => {
    const scoreDataRows = options.fetchScoreDataRows
      ? await options.fetchScoreDataRows(currentEventId)
      : (
          await prisma.eventParticipant.findMany({
            where: {
              eventId: { not: currentEventId },
              event: { sportId: PGA_GOLF_SPORT_ID },
            },
            select: { scoreData: true },
          })
        ).map((row) => row.scoreData);
    const usableScorecards = scoreDataRows
      .map((scoreData) => completedRoundsOnly(scoreData))
      .filter((scoreData): scoreData is Record<string, unknown> =>
        Boolean(scoreData),
      );
    const outcomes = extractGenericHoleOutcomes(usableScorecards);
    return {
      model: buildGenericScoringModel(outcomes),
      eventParticipantCount: usableScorecards.length,
      holeSampleCount: outcomes.length,
    };
  })();

  cache.set(currentEventId, {
    expiresAt: now + (options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
    value,
  });
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
  try {
    return await value;
  } catch (error) {
    cache.delete(currentEventId);
    throw error;
  }
}
