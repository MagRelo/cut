import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { ActiveEventResponse } from "../types/event";
import type { Contest } from "../types/contest";
import type { ContestEventSummary, LeagueContest } from "../components/contest/GroupedContestList";
import apiClient from "../utils/apiClient";
import { ApiError } from "../utils/apiError";
import { queryKeys } from "../utils/queryKeys";
import { useAuth } from "../contexts/AuthContext";
import { useSportsQuery } from "./useSportData";

const ACTIVE_EVENT_STALE_MS = 5 * 60 * 1000;

function eventSummaryFromActive(active: ActiveEventResponse): ContestEventSummary {
  const meta =
    typeof active.event.metadata === "object" && active.event.metadata !== null
      ? (active.event.metadata as { name?: string; startDate?: string; endDate?: string })
      : {};
  return {
    id: active.event.id,
    sportId: active.sport.id,
    sportName: active.sport.name,
    externalId: active.event.externalId,
    name: meta.name ?? active.event.externalId,
    startDate: meta.startDate ?? null,
    endDate: meta.endDate ?? null,
  };
}

function sortContestsByEntryFee(contests: LeagueContest[]): LeagueContest[] {
  return [...contests].sort((a, b) => {
    const feeA = a.settings?.primaryDeposit ?? 0;
    const feeB = b.settings?.primaryDeposit ?? 0;
    return feeB - feeA;
  });
}

export function useLiveContestsAcrossSports() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const sportsQuery = useSportsQuery();
  const sports = sportsQuery.data ?? [];

  const activeEventQueries = useQueries({
    queries: sports.map((sport) => ({
      queryKey: queryKeys.sports.activeEvent(sport.id),
      queryFn: async (): Promise<ActiveEventResponse | null> => {
        try {
          return await apiClient.get<ActiveEventResponse>(`/sports/${sport.id}/events/active`);
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
    })),
  });

  const activeEvents = useMemo(() => {
    return sports
      .map((sport, index) => {
        const active = activeEventQueries[index]?.data;
        if (!active?.event?.id) return null;
        return { sport, active };
      })
      .filter((entry): entry is { sport: (typeof sports)[number]; active: ActiveEventResponse } =>
        Boolean(entry),
      );
  }, [sports, activeEventQueries]);

  const contestsQueries = useQueries({
    queries: activeEvents.map(({ active }) => ({
      queryKey: queryKeys.contests.byEvent(active.event.id, "all", userId, undefined),
      queryFn: async () => {
        const params = new URLSearchParams({ eventId: active.event.id });
        return await apiClient.get<Contest[]>(`/contests?${params.toString()}`);
      },
      enabled: Boolean(active.event.id),
      staleTime: Infinity,
      gcTime: 12 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: (previousData: Contest[] | undefined) => previousData,
    })),
  });

  const contests = useMemo(() => {
    const merged: LeagueContest[] = [];

    activeEvents.forEach(({ active }, index) => {
      const eventContests = contestsQueries[index]?.data ?? [];
      const eventSummary = eventSummaryFromActive(active);
      for (const contest of eventContests) {
        merged.push({ ...contest, eventSummary });
      }
    });

    return sortContestsByEntryFee(merged);
  }, [activeEvents, contestsQueries]);

  const isActiveEventsLoading =
    sportsQuery.isLoading || activeEventQueries.some((query) => query.isLoading);

  const isContestsLoading =
    activeEvents.length > 0 &&
    contestsQueries.some(
      (query, index) => query.isLoading && contestsQueries[index]?.data === undefined,
    );

  const isLoading = isActiveEventsLoading || isContestsLoading;

  const fetchError =
    sportsQuery.error ??
    activeEventQueries.find((query) => query.error)?.error ??
    contestsQueries.find((query) => query.error)?.error;

  const error =
    fetchError instanceof Error
      ? fetchError.message
      : fetchError
        ? "Failed to load contests"
        : null;

  return {
    contests,
    isLoading,
    error,
  };
}
