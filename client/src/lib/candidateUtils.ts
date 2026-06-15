import type { Candidate } from "@cut/sport-sdk";
import type { PlatformLineupPick } from "../types/event";

export function candidatesByParticipantIdMap(
  candidates: Candidate[],
): Map<string, Candidate> {
  return new Map(candidates.map((candidate) => [candidate.participantId, candidate]));
}

export function isLineupWithPicks(
  lineup: ContestLineupShape | undefined,
): lineup is { id: string; name: string; picks: PlatformLineupPick[] } {
  return Boolean(lineup && Array.isArray(lineup.picks));
}

type ContestLineupShape = {
  id: string;
  name?: string;
  picks?: PlatformLineupPick[];
};

export function lineupPicksFromContestLineup(lineup: {
  lineup?: ContestLineupShape;
}): PlatformLineupPick[] {
  if (!isLineupWithPicks(lineup.lineup)) {
    return [];
  }
  return lineup.lineup.picks;
}

export function candidatesForLineupPicks(
  picks: PlatformLineupPick[],
  byParticipantId: Map<string, Candidate>,
): Candidate[] {
  return [...picks]
    .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
    .map((pick) => {
      const participantId = pick.participant?.id;
      if (!participantId) return null;
      return byParticipantId.get(participantId) ?? null;
    })
    .filter((candidate): candidate is Candidate => candidate != null);
}

export function contestLineupDisplayName(lineup: { lineup?: { name?: string } }): string {
  return lineup.lineup?.name ?? "Lineup";
}
