import { candidatesFromLineupPicks, type Candidate } from "@cut/sport-sdk";
import type { PlatformLineupPick } from "../types/event";

export function isLineupWithPicks(
  lineup: ContestLineupShape | undefined,
): lineup is { id: string; name: string; candidates: PlatformLineupPick[] } {
  return Boolean(lineup && Array.isArray(lineup.candidates));
}

type ContestLineupShape = {
  id: string;
  name?: string;
  candidates?: PlatformLineupPick[];
};

export function lineupPicksFromContestLineup(lineup: {
  lineup?: ContestLineupShape;
}): PlatformLineupPick[] {
  if (!isLineupWithPicks(lineup.lineup)) {
    return [];
  }
  return lineup.lineup.candidates;
}

export function candidatesFromContestLineup(lineup: { lineup?: ContestLineupShape }): Candidate[] {
  return candidatesFromLineupPicks(lineupPicksFromContestLineup(lineup));
}

export function contestLineupDisplayName(lineup: { lineup?: { name?: string } }): string {
  return lineup.lineup?.name ?? "Lineup";
}
