import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { ContestDirectoryResponse, ContestDirectoryScope } from "../types/contest";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";
import { useAuth } from "../contexts/AuthContext";
import { CONTEST_LIST_STALE_MS } from "../lib/queryTiming";

/**
 * Contest list/directory — no interval poll.
 * Stales after 15m; refetch on focus so other users' contests / status changes appear.
 * keepPreviousData avoids blanking the list when the key changes (user / chain).
 */
export function useContestDirectory(scope: ContestDirectoryScope = "all") {
  const { user } = useAuth();
  const { chainId, isConnected } = useAccount();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: queryKeys.contests.directory(scope, userId, isConnected ? chainId : "all"),
    queryFn: async () => {
      const params = new URLSearchParams({ scope });
      if (isConnected && chainId) {
        params.set("chainId", String(chainId));
      }
      return await apiClient.get<ContestDirectoryResponse>(
        `/contests/directory?${params.toString()}`,
      );
    },
    staleTime: CONTEST_LIST_STALE_MS,
    gcTime: 12 * 60 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
