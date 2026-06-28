import type { Candidate } from "@cut/sport-sdk";
import type { PlatformLineup, PlatformLineupPick } from "../types/event";
import { candidatesForLineupPicks } from "./candidateUtils";
import { predictionNumericValue } from "./sportPrediction";

export function buildCandidatesByEventParticipantId(
  candidates: Candidate[],
): Map<string, Candidate> {
  return new Map(candidates.map((candidate) => [candidate.eventParticipantId, candidate]));
}

export function platformLineupPrediction(lineup: PlatformLineup): number | null {
  return predictionNumericValue(lineup.prediction);
}

export function platformLineupEventParticipantIds(lineup: PlatformLineup): string[] {
  return lineup.picks
    .map((pick) => pick.eventParticipantId)
    .filter((id): id is string => Boolean(id));
}

function participantLastName(
  participant: NonNullable<PlatformLineupPick["participant"]>,
): string | null {
  const metadata = participant.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const topLevel = (metadata as { lastName?: string | null }).lastName;
    if (topLevel?.trim()) return topLevel.trim();

    const nested = (metadata as { participant?: { lastName?: string | null } }).participant
      ?.lastName;
    if (nested?.trim()) return nested.trim();
  }

  const displayName = participant.displayName?.trim();
  if (!displayName) return null;

  const parts = displayName.split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1]! : displayName;
}

export function lineupPickLastNames(lineup: PlatformLineup): string[] {
  return lineup.picks
    .map((pick) => (pick.participant ? participantLastName(pick.participant) : null))
    .filter((name): name is string => Boolean(name));
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
