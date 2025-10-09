import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Tournament } from "../types/tournament";
import { type PlayerWithTournamentData } from "../types/player";
import { type Contest } from "../types/contest";

export type ContestWithCount = Contest & {
  _count: {
    contestLineups: number;
  };
};

export interface TournamentData {
  tournament: Tournament;
  players: PlayerWithTournamentData[];
  contests: ContestWithCount[];
}

/**
 * Fetches the current active tournament with players and contests
 *
 * Benefits of using React Query:
 * - Automatic caching (no duplicate requests)
 * - Background refetching (data stays fresh)
 * - Loading and error states built-in
 * - Automatic refetch on window focus
 * - Data persists across component unmounts
 */
export function useTournamentData() {
  return useQuery({
    queryKey: queryKeys.tournaments.active(),
    queryFn: async () => {
      const data = await apiClient.get<TournamentData>("/tournaments/active");
      return data;
    },
    // Keep data fresh for 2 minutes before considering it stale
    staleTime: 2 * 60 * 1000,
    // Refetch every 10 minutes to keep live scores updated
    refetchInterval: 10 * 60 * 1000,
    // Always refetch when window regains focus (user returns to tab)
    refetchOnWindowFocus: true,
    // Cache data for 10 minutes even when component unmounts
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get just the tournament from the cached data
 */
export function useCurrentTournament() {
  const { data, ...rest } = useTournamentData();
  return {
    tournament: data?.tournament ?? null,
    ...rest,
  };
}

/**
 * Hook to get just the players from the cached data
 */
export function useTournamentPlayers() {
  const { data, ...rest } = useTournamentData();
  return {
    players: data?.players ?? [],
    ...rest,
  };
}

/**
 * Hook to get just the contests from the cached data
 */
export function useTournamentContests() {
  const { data, ...rest } = useTournamentData();
  return {
    contests: data?.contests ?? [],
    ...rest,
  };
}
