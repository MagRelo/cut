import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Contest, type TimelineData } from "../types/contest";

/**
 * Fetches a single contest by ID. Loads contest payload and timeline in parallel
 * (`GET /contests/:id` + `GET /contests/:id/timeline`) and merges for charts.
 *
 * Benefits:
 * - Automatic caching by contest ID
 * - Shared data across all components viewing the same contest
 * - Periodic refetch keeps lineup timeline data fresh
 * - Built-in loading and error states
 */
export function useContestQuery(contestId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contests.byId(contestId ?? ""),
    queryFn: async () => {
      if (!contestId) throw new Error("Contest ID is required");
      const [contest, timeline] = await Promise.all([
        apiClient.get<Contest>(`/contests/${contestId}`),
        apiClient.get<TimelineData>(`/contests/${contestId}/timeline`),
      ]);
      return { ...contest, timeline };
    },
    enabled: !!contestId, // Only run query if contestId exists
    staleTime: 2 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
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
  const { isConnected } = useAccount();

  return useQuery({
    queryKey: queryKeys.contests.byTournament(tournamentId ?? "", chainId ?? "all"),
    queryFn: async () => {
      if (!tournamentId) throw new Error("Tournament ID is required");
      // Only send chainId if user is connected
      const url =
        isConnected && chainId
          ? `/contests?tournamentId=${tournamentId}&chainId=${chainId}`
          : `/contests?tournamentId=${tournamentId}`;
      return await apiClient.get<Contest[]>(url);
    },
    enabled: !!tournamentId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });
}
