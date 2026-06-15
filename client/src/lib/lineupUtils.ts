import type { Candidate } from "@cut/sport-sdk";
import type { PlatformLineup, PlatformLineupPick } from "../types/event";
import type { PlatformLineupListItem } from "../types/lineup";
import type { PlayerWithTournamentData } from "../types/player";
import { candidateToPlayer } from "./golfEventAdapter";
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

export function platformLineupToPlayers(
  lineup: PlatformLineup,
  eventId: string,
  candidatesByParticipantId: Map<string, Candidate>,
): PlayerWithTournamentData[] {
  return lineup.picks
    .map((pick) => {
      const participantId = pick.participant?.id;
      if (!participantId) return null;
      const candidate = candidatesByParticipantId.get(participantId);
      if (!candidate) return null;
      return candidateToPlayer(candidate, eventId);
    })
    .filter((player): player is PlayerWithTournamentData => player !== null);
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

export function enrichLineupListItem(
  lineup: PlatformLineupListItem,
  eventId: string,
  candidates: Candidate[],
): PlatformLineupListItem & {
  players: PlayerWithTournamentData[];
  winningScorePrediction: number | null;
} {
  const candidatesByParticipantId = buildCandidatesByParticipantId(candidates);
  return {
    ...lineup,
    players: platformLineupToPlayers(lineup, eventId, candidatesByParticipantId),
    winningScorePrediction: platformLineupPrediction(lineup),
  };
}
