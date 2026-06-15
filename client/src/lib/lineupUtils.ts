import type { Candidate } from "@cut/sport-sdk";
import type { PlatformLineup, PlatformLineupPick } from "../types/event";
import { candidatesForLineupPicks } from "./candidateUtils";
import { golfPredictionValue } from "./golfPrediction";

export function buildCandidatesByParticipantId(
  candidates: Candidate[],
): Map<string, Candidate> {
  return new Map(candidates.map((candidate) => [candidate.participantId, candidate]));
}

export function platformLineupPrediction(lineup: PlatformLineup): number | null {
  return golfPredictionValue(lineup.prediction);
}

export function platformLineupParticipantIds(lineup: PlatformLineup): string[] {
  return lineup.picks
    .map((pick) => pick.participant?.id)
    .filter((id): id is string => Boolean(id));
}

export function candidatesForPlatformLineup(
  lineup: PlatformLineup,
  candidatesByParticipantId: Map<string, Candidate>,
): Candidate[] {
  return candidatesForLineupPicks(lineup.picks, candidatesByParticipantId);
}

export function buildOptimisticPicks(
  participantIds: string[],
  candidates: Candidate[],
): PlatformLineupPick[] {
  const byParticipantId = buildCandidatesByParticipantId(candidates);
  return participantIds.map((participantId, slotIndex) => {
    const candidate = byParticipantId.get(participantId);
    return {
      id: `optimistic-${slotIndex}`,
      slotIndex,
      eventParticipantId: candidate?.eventParticipantId ?? "",
      participant: candidate
        ? {
            id: candidate.participantId,
            displayName: candidate.displayName,
            externalId: null,
            metadata: candidate.metadata,
          }
        : null,
      scoreData: null,
      total: null,
    };
  });
}
