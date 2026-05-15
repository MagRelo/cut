import { useQuery, QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { resolveTournamentRoundNumber } from "../components/player/playerRoundUtils";
import { type Tournament } from "../types/tournament";
import { type PlayerWithTournamentData } from "../types/player";

export interface ActiveTournamentMetadataResponse {
  tournament: Tournament;
}

export interface ActiveTournamentPlayersResponse {
  players: PlayerWithTournamentData[];
}

export interface ActiveTournamentState {
  currentTournament: Tournament | null;
  players: PlayerWithTournamentData[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  isTournamentEditable: boolean;
  tournamentStatusDisplay: string;
}

const METADATA_STALE_MS = 24 * 60 * 60 * 1000;
const METADATA_GC_MS = 24 * 60 * 60 * 1000;

const PLAYERS_STALE_MS = 5 * 60 * 1000;
const PLAYERS_REFETCH_MS = 5 * 60 * 1000;
const PLAYERS_GC_MS = 30 * 60 * 1000;

/**
 * Active tournament row for header, app gate, and tournamentId (GET /tournaments/active/metadata).
 * Long-lived cache; contest list stays on useContestsQuery.
 */
export function useTournamentMetadata() {
  return useQuery({
    queryKey: queryKeys.tournaments.activeMetadata(),
    queryFn: async () => {
      const data = await apiClient.get<ActiveTournamentMetadataResponse>("/tournaments/active/metadata");
      return data;
    },
    staleTime: METADATA_STALE_MS,
    gcTime: METADATA_GC_MS,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Leaderboard / lineup player payload for the active tournament week.
 * Keyed by tournamentId so cache resets on week rollover.
 */
export function useActiveTournamentPlayers(tournamentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tournaments.activePlayers(tournamentId ?? ""),
    queryFn: async () => {
      const data = await apiClient.get<ActiveTournamentPlayersResponse>("/tournaments/active/players");
      return data;
    },
    enabled: Boolean(tournamentId),
    staleTime: PLAYERS_STALE_MS,
    refetchInterval: PLAYERS_REFETCH_MS,
    refetchOnWindowFocus: false,
    gcTime: PLAYERS_GC_MS,
    placeholderData: (previousData) => previousData,
  });
}

export function useCurrentTournament() {
  const q = useTournamentMetadata();
  return {
    ...q,
    tournament: q.data?.tournament ?? null,
  };
}

/** Active tournament round label and 1–4 number for scorecard / player UI. */
export function useActiveTournamentRound() {
  const { tournament } = useCurrentTournament();
  const roundDisplay = tournament?.roundDisplay ?? "R1";
  const currentRound = tournament?.currentRound;
  const roundNumber = resolveTournamentRoundNumber(roundDisplay, currentRound);
  return { tournament, roundDisplay, currentRound, roundNumber };
}

export function useTournamentPlayers() {
  const meta = useTournamentMetadata();
  const tournamentId = meta.data?.tournament?.id;
  const playersQuery = useActiveTournamentPlayers(tournamentId);

  return {
    players: playersQuery.data?.players ?? [],
    isLoading: meta.isLoading || (Boolean(tournamentId) && playersQuery.isLoading),
    isFetching: meta.isFetching || playersQuery.isFetching,
    error: meta.error ?? playersQuery.error,
    refetch: async () => {
      await Promise.all([meta.refetch(), playersQuery.refetch()]);
    },
  };
}

export function useActiveTournament(): ActiveTournamentState {
  const shell = useTournamentMetadata();
  const tournamentId = shell.data?.tournament?.id;
  const playersQuery = useActiveTournamentPlayers(tournamentId);

  const currentTournament = shell.data?.tournament ?? null;
  const players = playersQuery.data?.players ?? [];

  const isLoading = shell.isLoading || (Boolean(tournamentId) && playersQuery.isLoading);
  const isFetching = shell.isFetching || playersQuery.isFetching;

  const rawError = shell.error ?? playersQuery.error;
  const typedError =
    rawError instanceof Error ? rawError : rawError ? new Error("Failed to load tournament") : null;

  const isTournamentEditable =
    currentTournament?.status !== "IN_PROGRESS" && currentTournament?.status !== "COMPLETED";

  const tournamentStatusDisplay =
    currentTournament?.status
      ?.split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ") ?? "";

  return {
    currentTournament,
    players,
    isLoading,
    isFetching,
    error: typedError,
    isTournamentEditable,
    tournamentStatusDisplay,
  };
}

export async function prefetchTournamentMetadata(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tournaments.activeMetadata(),
    queryFn: async () => {
      const data = await apiClient.get<ActiveTournamentMetadataResponse>("/tournaments/active/metadata");
      return data;
    },
    staleTime: METADATA_STALE_MS,
  });
}

export async function prefetchActiveTournamentPlayers(queryClient: QueryClient, tournamentId: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tournaments.activePlayers(tournamentId),
    queryFn: async () => {
      const data = await apiClient.get<ActiveTournamentPlayersResponse>("/tournaments/active/players");
      return data;
    },
    staleTime: PLAYERS_STALE_MS,
  });
}

/** Prefetch metadata then active players (uses tournament id from cached metadata). */
export async function prefetchTournamentShellAndPlayers(queryClient: QueryClient) {
  await prefetchTournamentMetadata(queryClient);
  const tid = queryClient.getQueryData<ActiveTournamentMetadataResponse>(
    queryKeys.tournaments.activeMetadata(),
  )?.tournament?.id;
  if (tid) {
    await prefetchActiveTournamentPlayers(queryClient, tid);
  }
}
