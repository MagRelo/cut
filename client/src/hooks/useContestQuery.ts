import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Contest, type TimelineData } from "../types/contest";
import { normalizeContestAddress } from "../utils/contestRoutes";
import { useAuth } from "../contexts/AuthContext";

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

interface UseContestsQueryOptions {
  userGroupId?: string;
}

/**
 * Fetches contests for a tournament. When signed in, the server merges public contests
 * with league contests for groups the user belongs to.
 */
export function useContestsQuery(
  tournamentId: string | undefined,
  chainId: number | undefined,
  options?: UseContestsQueryOptions,
) {
  const { user } = useAuth();
  const { isConnected } = useAccount();
  const userGroupId = options?.userGroupId;
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: queryKeys.contests.byTournament(
      tournamentId ?? "",
      chainId ?? "all",
      userId,
      userGroupId,
    ),
    queryFn: async () => {
      if (!tournamentId) throw new Error("Tournament ID is required");
      const params = new URLSearchParams({ tournamentId });
      if (isConnected && chainId) {
        params.set("chainId", String(chainId));
      }
      if (userGroupId) {
        params.set("userGroupId", userGroupId);
      }
      return await apiClient.get<Contest[]>(`/contests?${params.toString()}`);
    },
    enabled: !!tournamentId,
    staleTime: userGroupId ? 2 * 60 * 1000 : Infinity,
    gcTime: 12 * 60 * 60 * 1000,
    refetchOnWindowFocus: !!userGroupId,
    retry: 1,
    placeholderData: userGroupId ? undefined : (previousData) => previousData,
  });
}
