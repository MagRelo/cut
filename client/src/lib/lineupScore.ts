import type { PlatformLineup } from "../types/event";
import type { ContestLineup, PickPopularityEntry, PickPopularityMap } from "../types/lineup";

function scoreFromPlatformLineup(lineup: PlatformLineup | undefined): number {
  if (!lineup || !("score" in lineup) || typeof lineup.score !== "number") {
    return 0;
  }
  return lineup.score;
}

/** Display score for a contest lineup row or lineup card. */
export function lineupDisplayScore(contestLineup: ContestLineup): number {
  if (contestLineup.contestId) {
    return contestLineup.score ?? 0;
  }
  const platform = contestLineup.lineup;
  if (platform && "picks" in platform) {
    return scoreFromPlatformLineup(platform);
  }
  return contestLineup.score ?? 0;
}

export function lineupBaseScore(contestLineup: ContestLineup): number | null {
  return contestLineup.baseScore ?? null;
}

export function lineupPopularityBonus(contestLineup: ContestLineup): number {
  return contestLineup.popularityBonus ?? 0;
}

export function pickPopularityForParticipant(
  map: PickPopularityMap | null | undefined,
  eventParticipantId: string,
): PickPopularityEntry | null {
  if (!map) return null;
  return map[eventParticipantId] ?? null;
}
