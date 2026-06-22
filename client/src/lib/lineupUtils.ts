import type { Candidate } from "@cut/sport-sdk";
import type { PlatformLineup, PlatformLineupPick } from "../types/event";
import { candidatesForLineupPicks } from "./candidateUtils";
import { golfPredictionValue } from "./golfPrediction";

export function buildCandidatesByEventParticipantId(
  candidates: Candidate[],
): Map<string, Candidate> {
  return new Map(candidates.map((candidate) => [candidate.eventParticipantId, candidate]));
}

export function platformLineupPrediction(lineup: PlatformLineup): number | null {
  return golfPredictionValue(lineup.prediction);
}

export function platformLineupEventParticipantIds(lineup: PlatformLineup): string[] {
  return lineup.picks
    .map((pick) => pick.eventParticipantId)
    .filter((id): id is string => Boolean(id));
}

export function candidatesForPlatformLineup(
  lineup: PlatformLineup,
  candidatesByEventParticipantId: Map<string, Candidate>,
): Candidate[] {
  return candidatesForLineupPicks(lineup.picks, candidatesByEventParticipantId);
}

export function buildOptimisticPicks(
  eventParticipantIds: string[],
  candidates: Candidate[],
): PlatformLineupPick[] {
  const byEventParticipantId = buildCandidatesByEventParticipantId(candidates);
  return eventParticipantIds.map((eventParticipantId, slotIndex) => {
    const candidate = byEventParticipantId.get(eventParticipantId);
    return {
      id: `optimistic-${slotIndex}`,
      slotIndex,
      eventParticipantId,
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
