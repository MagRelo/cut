import type { PlatformLineup } from "../types/event";
import type { ContestLineup } from "../types/lineup";

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
