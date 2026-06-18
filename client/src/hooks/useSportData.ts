import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SportSummary } from "@cut/sport-sdk";
import type { Candidate } from "@cut/sport-sdk";
import apiClient from "../utils/apiClient";
import { ApiError } from "../utils/apiError";
import { queryKeys } from "../utils/queryKeys";
import type { ActiveEventResponse } from "../types/event";

const SPORTS_STALE_MS = 24 * 60 * 60 * 1000;
const ACTIVE_EVENT_STALE_MS = 5 * 60 * 1000;
const CANDIDATES_STALE_MS = 5 * 60 * 1000;

export function useSportsQuery() {
  return useQuery({
    queryKey: queryKeys.sports.list(),
    queryFn: () => apiClient.get<SportSummary[]>("/sports"),
    staleTime: SPORTS_STALE_MS,
  });
}

export function useFirstEnabledSportId(): string | undefined {
  const { data: sports = [] } = useSportsQuery();
  return useMemo(() => sports.find((sport) => sport.isEnabled)?.id, [sports]);
}

export function useActiveEventQuery(sportId: string) {
  return useQuery({
    queryKey: queryKeys.sports.activeEvent(sportId),
    queryFn: async () => {
      try {
        return await apiClient.get<ActiveEventResponse>(`/sports/${sportId}/events/active`);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: ACTIVE_EVENT_STALE_MS,
    refetchInterval: ACTIVE_EVENT_STALE_MS,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    enabled: Boolean(sportId),
  });
}

export function useEventCandidatesQuery(
  sportId: string | undefined,
  eventId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.sports.candidates(sportId ?? "", eventId ?? ""),
    queryFn: async () => {
      const data = await apiClient.get<{ candidates: Candidate[] }>(
        `/sports/${sportId}/events/${eventId}/candidates`,
      );
      return data.candidates;
    },
    enabled: Boolean(sportId && eventId),
    staleTime: CANDIDATES_STALE_MS,
    refetchInterval: CANDIDATES_STALE_MS,
    refetchOnWindowFocus: false,
  });
}
