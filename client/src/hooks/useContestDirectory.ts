import { useQuery } from "@tanstack/react-query";
import type { ContestDirectoryScope } from "../types/contest";
import { useAuth } from "../contexts/AuthContext";
import {
  contestDirectoryQueryKey,
  contestDirectoryStaleMs,
  fetchContestDirectory,
} from "../lib/contestDirectoryQuery";

/**
 * Contest list/directory — no interval poll.
 * Waits for auth to resolve so signed-in users do not fetch the anonymous key first.
 * Stales after 15m; refetch on focus so other users' contests / status changes appear.
 * A scope change keeps the previous list on screen. An account change does not.
 * Chain filter uses VITE_TARGET_CHAIN, not wagmi connect timing.
 */
export function useContestDirectory(scope: ContestDirectoryScope = "all") {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: contestDirectoryQueryKey(scope, userId),
    queryFn: () => fetchContestDirectory(scope),
    enabled: !authLoading,
    staleTime: contestDirectoryStaleMs,
    gcTime: 12 * 60 * 60 * 1000,
    placeholderData: (previousData, previousQuery) => {
      if (previousQuery?.queryKey[3] !== (userId ?? "anon")) return undefined;
      return previousData;
    },
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
