import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Contest } from "../types/contest";

/**
 * Fetches a single contest by ID
 *
 * Benefits:
 * - Automatic caching by contest ID
 * - Shared data across all components viewing the same contest
 * - Automatic refetching when data becomes stale
 * - Built-in loading and error states
 */
export function useContestQuery(contestId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contests.byId(contestId ?? ""),
    queryFn: async () => {
      if (!contestId) throw new Error("Contest ID is required");
      return await apiClient.get<Contest>(`/contests/${contestId}`);
    },
    enabled: !!contestId, // Only run query if contestId exists
    staleTime: 1 * 60 * 1000, // 1 minute - contest data changes when people join/leave
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 1,
  });
}

/**
 * Fetches all contests for a tournament
 *
 * @param tournamentId - The tournament ID
 * @param chainId - The chain ID to filter contests
 */
export function useContestsQuery(tournamentId: string | undefined, chainId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.contests.byTournament(tournamentId ?? "", chainId ?? 0),
    queryFn: async () => {
      if (!tournamentId || !chainId) throw new Error("Tournament ID and Chain ID are required");
      return await apiClient.get<Contest[]>(
        `/contests?tournamentId=${tournamentId}&chainId=${chainId}`
      );
    },
    enabled: !!tournamentId && !!chainId,
    staleTime: 30 * 1000, // 30 seconds - contest list changes frequently
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
