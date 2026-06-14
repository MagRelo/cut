import type { QueryClient } from "@tanstack/react-query";
import type { Candidate } from "@cut/sport-sdk";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";
import type { PlatformLineup } from "../types/event";
import { DEFAULT_SPORT_ID } from "../hooks/useSportData";
import { toGolfPrediction } from "./golfPrediction";
import {
  candidateToPlayer,
  platformLineupToTournamentLineup,
} from "./golfEventAdapter";
import type { TournamentLineup } from "../types/player";

function candidateMaps(candidates: Candidate[]) {
  const eventParticipantIdByParticipantId = new Map(
    candidates.map((candidate) => [candidate.participantId, candidate.eventParticipantId]),
  );
  const participantIdByEventParticipantId = new Map(
    candidates.map((candidate) => [candidate.eventParticipantId, candidate.participantId]),
  );
  return { eventParticipantIdByParticipantId, participantIdByEventParticipantId };
}

export function eventParticipantIdsFromParticipantIds(
  candidates: Candidate[],
  participantIds: string[],
): string[] {
  const { eventParticipantIdByParticipantId } = candidateMaps(candidates);
  return participantIds
    .map((participantId) => eventParticipantIdByParticipantId.get(participantId))
    .filter((id): id is string => Boolean(id));
}

export function participantIdFromEventParticipantId(
  candidates: Candidate[],
  eventParticipantId: string,
): string | undefined {
  return candidateMaps(candidates).participantIdByEventParticipantId.get(eventParticipantId);
}

export function participantIdsToEventParticipantIds(
  queryClient: QueryClient,
  sportId: string,
  eventId: string,
  participantIds: string[],
): string[] {
  const candidates =
    queryClient.getQueryData<Candidate[]>(queryKeys.sports.candidates(sportId, eventId)) ?? [];

  return eventParticipantIdsFromParticipantIds(candidates, participantIds);
}

/** Map participant IDs to eventParticipant IDs, fetching candidates when cache is missing. */
export async function resolveEventParticipantIds(
  queryClient: QueryClient,
  sportId: string,
  eventId: string,
  participantIds: string[],
): Promise<string[]> {
  if (participantIds.length === 0) {
    return [];
  }

  let candidates =
    queryClient.getQueryData<Candidate[]>(queryKeys.sports.candidates(sportId, eventId)) ?? [];
  let eventParticipantIds = eventParticipantIdsFromParticipantIds(candidates, participantIds);

  if (eventParticipantIds.length < participantIds.length) {
    const data = await apiClient.get<{ candidates: Candidate[] }>(
      `/sports/${sportId}/events/${eventId}/candidates`,
    );
    candidates = data.candidates;
    queryClient.setQueryData(queryKeys.sports.candidates(sportId, eventId), candidates);
    eventParticipantIds = eventParticipantIdsFromParticipantIds(candidates, participantIds);
  }

  if (eventParticipantIds.length < participantIds.length) {
    throw new Error("Could not resolve one or more player picks for this event");
  }

  return eventParticipantIds;
}

async function lineupToTournamentShape(
  lineup: PlatformLineup,
  sportId: string,
  eventId: string,
): Promise<TournamentLineup> {
  const candidatesResponse = await apiClient.get<{ candidates: Candidate[] }>(
    `/sports/${sportId}/events/${eventId}/candidates`,
  );
  const playersByParticipantId = new Map(
    candidatesResponse.candidates.map((candidate) => [
      candidate.participantId,
      candidateToPlayer(candidate, eventId),
    ]),
  );

  return platformLineupToTournamentLineup(lineup, playersByParticipantId);
}

export async function createLineupForEvent(params: {
  eventId: string;
  sportId?: string;
  picks: string[];
  name?: string;
  winningScorePrediction?: number;
}): Promise<TournamentLineup> {
  const sportId = params.sportId ?? DEFAULT_SPORT_ID;
  const response = await apiClient.post<{ lineup: PlatformLineup }>(
    `/lineups/${params.eventId}`,
    {
      picks: params.picks,
      name: params.name,
      prediction: toGolfPrediction(params.winningScorePrediction),
    },
  );

  return lineupToTournamentShape(response.lineup, sportId, params.eventId);
}

export async function updateLineupById(params: {
  lineupId: string;
  eventId: string;
  sportId?: string;
  picks: string[];
  name?: string;
  winningScorePrediction?: number;
}): Promise<TournamentLineup> {
  const sportId = params.sportId ?? DEFAULT_SPORT_ID;
  const response = await apiClient.put<{ lineup: PlatformLineup }>(
    `/lineups/${params.lineupId}`,
    {
      picks: params.picks,
      name: params.name,
      prediction: toGolfPrediction(params.winningScorePrediction),
    },
  );

  return lineupToTournamentShape(response.lineup, sportId, params.eventId);
}

/** @deprecated Use createLineupForEvent or updateLineupById */
export async function saveLineupForEvent(params: {
  eventId: string;
  sportId?: string;
  picks: string[];
  name?: string;
  winningScorePrediction?: number;
}): Promise<TournamentLineup> {
  return createLineupForEvent(params);
}
