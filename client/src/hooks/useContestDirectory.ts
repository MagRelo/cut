import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { ContestDirectoryResponse, ContestDirectoryScope } from "../types/contest";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";
import { useAuth } from "../contexts/AuthContext";
import { SERVER_SYNC_INTERVAL_MS } from "../lib/queryTiming";

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
    staleTime: scope === "past" ? Infinity : SERVER_SYNC_INTERVAL_MS,
    refetchInterval: scope === "live" ? SERVER_SYNC_INTERVAL_MS : false,
    refetchOnWindowFocus: scope !== "past",
    retry: 1,
  });
}
