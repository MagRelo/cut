import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type TournamentLineup } from "../types/player";

interface LineupResponse {
  lineups: TournamentLineup[];
}

/**
 * Fetches all lineups for a tournament (typically for the logged-in user)
 *
 * Benefits:
 * - Automatic caching by tournament ID
 * - Shared data across all components
 * - Automatic refetching when data becomes stale
 * - Built-in loading and error states
 */
export function useLineupsQuery(tournamentId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.lineups.byTournament(tournamentId ?? ""),
    queryFn: async () => {
      if (!tournamentId) throw new Error("Tournament ID is required");
      const data = await apiClient.get<LineupResponse>(`/lineup/${tournamentId}`);
      return data.lineups || [];
    },
    enabled: !!tournamentId && enabled, // Only run if tournamentId exists and enabled
    staleTime: 2 * 60 * 1000, // 2 minutes - lineup data doesn't change often
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Fetches a single lineup by ID
 *
 * @param lineupId - The lineup ID to fetch
 * @param enabled - Whether to enable the query (default: true)
 */
export function useLineupQuery(lineupId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.lineups.byId(lineupId ?? ""),
    queryFn: async () => {
      if (!lineupId) throw new Error("Lineup ID is required");
      const data = await apiClient.get<LineupResponse>(`/lineup/lineup/${lineupId}`);
      return data.lineups[0] || null;
    },
    enabled: !!lineupId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Hook to get a lineup from the cache without fetching
 *
 * Useful when you need to access lineup data that's already been fetched
 * without triggering a new network request.
 */
export function useLineupFromCache(lineupId: string, tournamentId: string) {
  const { data: lineups } = useLineupsQuery(tournamentId, false);
  return lineups?.find((lineup) => lineup.id === lineupId) || null;
}

