import { useQuery } from "@tanstack/react-query";
import type { Candidate } from "@cut/sport-sdk";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import type { PlatformLineup } from "../types/event";
import { useAuth } from "../contexts/AuthContext";
import { candidateToPlayer, platformLineupToListItem } from "../lib/golfEventAdapter";
import { DEFAULT_SPORT_ID } from "./useSportData";

interface LineupsResponse {
  lineups: PlatformLineup[];
}

function buildPlayersMap(candidates: Candidate[], eventId: string) {
  return new Map(
    candidates.map((candidate) => [
      candidate.participantId,
      candidateToPlayer(candidate, eventId),
    ]),
  );
}

/**
 * Fetches the user's lineups for an event (platform API).
 */
export function useLineupsQuery(
  eventId: string | undefined,
  enabled: boolean = true,
  userId: string | undefined,
  sportId: string = DEFAULT_SPORT_ID,
) {
  const canRun = !!eventId && !!userId && enabled;

  return useQuery({
    queryKey: queryKeys.lineups.byEvent(userId ?? "_", eventId ?? "_"),
    queryFn: async () => {
      if (!eventId) throw new Error("Event ID is required");

      const [lineupsResponse, candidatesResponse] = await Promise.all([
        apiClient.get<LineupsResponse>(`/lineups/${eventId}`),
        apiClient.get<{ candidates: Candidate[] }>(
          `/sports/${sportId}/events/${eventId}/candidates`,
        ),
      ]);

      const playersByParticipantId = buildPlayersMap(candidatesResponse.candidates, eventId);
      return lineupsResponse.lineups.map((lineup) =>
        platformLineupToListItem(lineup, playersByParticipantId),
      );
    },
    enabled: canRun,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Fetches a single lineup by ID for the logged-in user.
 */
export function useLineupQuery(
  lineupId: string | undefined,
  eventId: string | undefined,
  enabled: boolean = true,
  userId: string | undefined,
  sportId: string = DEFAULT_SPORT_ID,
) {
  const canRun = !!lineupId && !!eventId && !!userId && enabled;

  return useQuery({
    queryKey: queryKeys.lineups.byId(userId ?? "_", lineupId ?? "_"),
    queryFn: async () => {
      if (!eventId || !lineupId) throw new Error("Event and lineup ID are required");

      const [lineupsResponse, candidatesResponse] = await Promise.all([
        apiClient.get<LineupsResponse>(`/lineups/${eventId}`),
        apiClient.get<{ candidates: Candidate[] }>(
          `/sports/${sportId}/events/${eventId}/candidates`,
        ),
      ]);

      const lineup = lineupsResponse.lineups.find((row) => row.id === lineupId);
      if (!lineup) {
        return null;
      }

      const playersByParticipantId = buildPlayersMap(candidatesResponse.candidates, eventId);
      return platformLineupToListItem(lineup, playersByParticipantId);
    },
    enabled: canRun,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useLineupFromCache(lineupId: string, eventId: string) {
  const { user } = useAuth();
  const { data: lineups } = useLineupsQuery(eventId, false, user?.id);
  return lineups?.find((lineup) => lineup.id === lineupId) ?? null;
}
