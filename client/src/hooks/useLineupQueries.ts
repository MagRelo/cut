import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type TournamentLineup } from "../types/player";
import { useAuth } from "../contexts/AuthContext";

interface LineupResponse {
  lineups: TournamentLineup[];
}

/**
 * Fetches all lineups for a tournament for the logged-in user.
 *
 * Query key includes `userId` so React Query cache does not leak across accounts.
 */
export function useLineupsQuery(
  tournamentId: string | undefined,
  enabled: boolean = true,
  userId: string | undefined
) {
  const canRun = !!tournamentId && !!userId && enabled;

  return useQuery({
    queryKey: queryKeys.lineups.byTournament(userId ?? "_", tournamentId ?? "_"),
    queryFn: async () => {
      if (!tournamentId) throw new Error("Tournament ID is required");
      const data = await apiClient.get<LineupResponse>(`/lineup/${tournamentId}`);
      return data.lineups || [];
    },
    enabled: canRun,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Fetches a single lineup by ID for the logged-in user.
 */
export function useLineupQuery(
  lineupId: string | undefined,
  enabled: boolean = true,
  userId: string | undefined
) {
  const canRun = !!lineupId && !!userId && enabled;

  return useQuery({
    queryKey: queryKeys.lineups.byId(userId ?? "_", lineupId ?? "_"),
    queryFn: async () => {
      if (!lineupId) throw new Error("Lineup ID is required");
      const data = await apiClient.get<LineupResponse>(`/lineup/lineup/${lineupId}`);
      return data.lineups[0] ?? null;
    },
    enabled: canRun,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Read a lineup from an already-fetched tournament list (no fetch; `enabled: false` on list query).
 */
export function useLineupFromCache(lineupId: string, tournamentId: string) {
  const { user } = useAuth();
  const { data: lineups } = useLineupsQuery(tournamentId, false, user?.id);
  return lineups?.find((lineup) => lineup.id === lineupId) ?? null;
}
