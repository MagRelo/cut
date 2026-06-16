import { useMemo } from "react";
import { useQuery, QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { resolveTournamentRoundNumber } from "../components/player/playerRoundUtils";
import {
  mergeTournament,
  type Tournament,
  type TournamentShell,
  type TournamentLive,
} from "../types/tournament";
import { type PlayerWithTournamentData } from "../types/player";

export interface ActiveTournamentShellResponse {
  tournament: TournamentShell;
}

export interface ActiveTournamentLiveResponse {
  tournament: TournamentLive;
  players: PlayerWithTournamentData[];
}

export interface ActiveTournamentState {
  tournament: Tournament | null;
  players: PlayerWithTournamentData[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  isTournamentEditable: boolean;
  tournamentStatusDisplay: string;
  refetch: () => Promise<void>;
}

const SHELL_STALE_MS = 24 * 60 * 60 * 1000;
const SHELL_GC_MS = 24 * 60 * 60 * 1000;

const LIVE_STALE_MS = 5 * 60 * 1000;
const LIVE_REFETCH_MS = 5 * 60 * 1000;
const LIVE_GC_MS = 30 * 60 * 1000;

/** Week/setup fields (GET /tournaments/active/shell). Long-lived cache. */
export function useTournamentShell() {
  return useQuery({
    queryKey: queryKeys.tournaments.activeShell(),
    queryFn: async () => {
      const data = await apiClient.get<ActiveTournamentShellResponse>("/tournaments/active/shell");
      return data;
    },
    staleTime: SHELL_STALE_MS,
    gcTime: SHELL_GC_MS,
    refetchOnWindowFocus: "always",
    refetchOnMount: "always",
    placeholderData: (previousData) => previousData,
  });
}

/** Cron-updated round status + player scores (GET /tournaments/active/live). */
export function useActiveTournamentLive(tournamentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tournaments.activeLive(tournamentId ?? ""),
    queryFn: async () => {
      const data = await apiClient.get<ActiveTournamentLiveResponse>("/tournaments/active/live");
      return data;
    },
    enabled: Boolean(tournamentId),
    staleTime: LIVE_STALE_MS,
    refetchInterval: LIVE_REFETCH_MS,
    refetchOnWindowFocus: false,
    gcTime: LIVE_GC_MS,
    placeholderData: (previousData) => previousData,
  });
}

function formatTournamentStatusDisplay(status: string | undefined): string {
  return (
    status
      ?.split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ") ?? ""
  );
}

/** Primary hook: merged tournament + live players + derived flags. */
export function useActiveTournament(): ActiveTournamentState {
  const shellQuery = useTournamentShell();
  const tournamentId = shellQuery.data?.tournament?.id;
  const liveQuery = useActiveTournamentLive(tournamentId);

  const tournament = useMemo(() => {
    const shell = shellQuery.data?.tournament;
    const live = liveQuery.data?.tournament;
    if (!shell || !live) return null;
    return mergeTournament(shell, live);
  }, [shellQuery.data?.tournament, liveQuery.data?.tournament]);

  const players = liveQuery.data?.players ?? [];

  const isLoading =
    shellQuery.isLoading || (Boolean(tournamentId) && liveQuery.isLoading);
  const isFetching = shellQuery.isFetching || liveQuery.isFetching;

  const rawError = shellQuery.error ?? liveQuery.error;
  const error =
    rawError instanceof Error ? rawError : rawError ? new Error("Failed to load tournament") : null;

  const isTournamentEditable =
    tournament?.status !== "IN_PROGRESS" && tournament?.status !== "COMPLETED";

  const tournamentStatusDisplay = formatTournamentStatusDisplay(tournament?.status);

  const refetch = async () => {
    await Promise.all([shellQuery.refetch(), liveQuery.refetch()]);
  };

  return {
    tournament,
    players,
    isLoading,
    isFetching,
    error,
    isTournamentEditable,
    tournamentStatusDisplay,
    refetch,
  };
}

/** Active tournament round label and 1–4 number for scorecard / player UI. */
export function useActiveTournamentRound() {
  const { tournament } = useActiveTournament();
  const roundDisplay = tournament?.roundDisplay ?? "R1";
  const currentRound = tournament?.currentRound;
  const roundNumber = resolveTournamentRoundNumber(roundDisplay, currentRound);
  return { tournament, roundDisplay, currentRound, roundNumber };
}

export async function prefetchTournamentShell(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tournaments.activeShell(),
    queryFn: async () => {
      const data = await apiClient.get<ActiveTournamentShellResponse>("/tournaments/active/shell");
      return data;
    },
    staleTime: SHELL_STALE_MS,
  });
}

export async function prefetchActiveTournamentLive(queryClient: QueryClient, tournamentId: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tournaments.activeLive(tournamentId),
    queryFn: async () => {
      const data = await apiClient.get<ActiveTournamentLiveResponse>("/tournaments/active/live");
      return data;
    },
    staleTime: LIVE_STALE_MS,
  });
}

/** Prefetch shell then live (uses tournament id from cached shell). */
export async function prefetchActiveTournament(queryClient: QueryClient) {
  await prefetchTournamentShell(queryClient);
  const tid = queryClient.getQueryData<ActiveTournamentShellResponse>(
    queryKeys.tournaments.activeShell(),
  )?.tournament?.id;
  if (tid) {
    await prefetchActiveTournamentLive(queryClient, tid);
  }
}
