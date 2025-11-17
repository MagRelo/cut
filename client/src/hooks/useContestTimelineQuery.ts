import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type TimelineData } from "../types/contest";

/**
 * Fetches timeline data for a contest
 *
 * Benefits:
 * - Automatic caching by contest ID
 * - Shared data across all components viewing the same contest timeline
 * - Automatic refetching when data becomes stale
 * - Built-in loading and error states
 * - Periodic refetching to keep timeline data fresh
 */
export function useContestTimelineQuery(contestId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contests.timeline(contestId ?? ""),
    queryFn: async () => {
      if (!contestId) throw new Error("Contest ID is required");
      return await apiClient.get<TimelineData>(`/contests/${contestId}/timeline`);
    },
    enabled: !!contestId, // Only run query if contestId exists
    staleTime: 2 * 60 * 1000, // Keep data fresh for 2 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes to keep timeline updated
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 1,
  });
}

