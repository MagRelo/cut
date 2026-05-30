import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Contest, type TimelineData } from "../types/contest";
import { normalizeContestAddress } from "../utils/contestRoutes";

/**
 * Loads the contest lobby from a contract address in the URL.
 * API calls after the initial fetch use the database id; only this hook accepts an address.
 */
export function useContestQuery(contestAddress: string | undefined) {
  const routeKey = contestAddress ? normalizeContestAddress(contestAddress) : "";

  return useQuery({
    queryKey: queryKeys.contests.byLobbyRoute(routeKey),
    queryFn: async () => {
      if (!routeKey) throw new Error("Contest address is required");
      const contest = await apiClient.get<Contest>(`/contests/${routeKey}`);
      const timeline = await apiClient.get<TimelineData>(`/contests/${contest.id}/timeline`);
      return { ...contest, timeline };
    },
    enabled: !!routeKey,
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
      const url =
        isConnected && chainId
          ? `/contests?tournamentId=${tournamentId}&chainId=${chainId}`
          : `/contests?tournamentId=${tournamentId}`;
      return await apiClient.get<Contest[]>(url);
    },
    enabled: !!tournamentId,
    staleTime: Infinity,
    gcTime: 12 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
}
