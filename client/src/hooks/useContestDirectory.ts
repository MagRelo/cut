import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
 * keepPreviousData avoids blanking the list when the key changes (user identity).
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
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
