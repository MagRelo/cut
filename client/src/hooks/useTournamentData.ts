import { useMemo } from "react";
import { QueryClient } from "@tanstack/react-query";
import { resolveTournamentRoundNumber } from "../components/player/playerRoundUtils";
import {
  candidateToPlayer,
  golfEventToTournament,
  golfEventToTournamentLive,
  golfEventToTournamentShell,
} from "../lib/golfEventAdapter";
import {
  DEFAULT_SPORT_ID,
  prefetchActiveEvent,
  useActiveEventQuery,
  useEventCandidatesQuery,
} from "./useSportData";
import {
  mergeTournament,
  type Tournament,
  type TournamentShell,
  type TournamentLive,
} from "../types/tournament";
import { type PlayerWithTournamentData } from "../types/player";
import { useSportContext } from "../contexts/SportContext";

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
  eventId: string | undefined;
  sportId: string;
}

function formatTournamentStatusDisplay(status: string | undefined): string {
  return (
    status
      ?.split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ") ?? ""
  );
}

/** @deprecated Debug helper — maps active event to legacy shell shape. */
export function useTournamentShell() {
  const { sportId } = useSportContext();
  const activeQuery = useActiveEventQuery(sportId);

  return {
    ...activeQuery,
    data: activeQuery.data
      ? { tournament: golfEventToTournamentShell(activeQuery.data) }
      : undefined,
  };
}

/** @deprecated Debug helper — maps candidates to legacy live shape. */
export function useActiveTournamentLive(eventId: string | undefined) {
  const { sportId } = useSportContext();
  const activeQuery = useActiveEventQuery(sportId);
  const candidatesQuery = useEventCandidatesQuery(sportId, eventId);

  const data = useMemo(() => {
    if (!activeQuery.data || !eventId || !candidatesQuery.data) {
      return undefined;
    }
    return {
      tournament: golfEventToTournamentLive(activeQuery.data),
      players: candidatesQuery.data.map((candidate) =>
        candidateToPlayer(candidate, eventId),
      ),
    } satisfies ActiveTournamentLiveResponse;
  }, [activeQuery.data, candidatesQuery.data, eventId]);

  return {
    isLoading: activeQuery.isLoading || candidatesQuery.isLoading,
    isFetching: activeQuery.isFetching || candidatesQuery.isFetching,
    error: activeQuery.error ?? candidatesQuery.error,
    data,
    dataUpdatedAt: Math.max(activeQuery.dataUpdatedAt, candidatesQuery.dataUpdatedAt),
    refetch: async () => {
      await Promise.all([activeQuery.refetch(), candidatesQuery.refetch()]);
    },
  };
}

/** Primary hook: active event mapped to legacy tournament shape for existing UI. */
export function useActiveTournament(): ActiveTournamentState {
  const { sportId } = useSportContext();
  const activeQuery = useActiveEventQuery(sportId);
  const eventId = activeQuery.data?.event.id;
  const candidatesQuery = useEventCandidatesQuery(sportId, eventId);

  const tournament = useMemo(() => {
    if (!activeQuery.data) return null;
    return golfEventToTournament(activeQuery.data);
  }, [activeQuery.data]);

  const players = useMemo(() => {
    if (!eventId) return [];
    return (candidatesQuery.data ?? []).map((candidate) =>
      candidateToPlayer(candidate, eventId),
    );
  }, [candidatesQuery.data, eventId]);

  const isLoading =
    activeQuery.isLoading || (Boolean(eventId) && candidatesQuery.isLoading);
  const isFetching = activeQuery.isFetching || candidatesQuery.isFetching;

  const rawError = activeQuery.error ?? candidatesQuery.error;
  const error =
    rawError instanceof Error ? rawError : rawError ? new Error("Failed to load event") : null;

  const isTournamentEditable =
    tournament?.status !== "IN_PROGRESS" && tournament?.status !== "COMPLETED";

  const tournamentStatusDisplay = formatTournamentStatusDisplay(tournament?.status);

  const refetch = async () => {
    await Promise.all([activeQuery.refetch(), candidatesQuery.refetch()]);
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
    eventId,
    sportId,
  };
}

export function useActiveTournamentRound() {
  const { tournament } = useActiveTournament();
  const roundDisplay = tournament?.roundDisplay ?? "R1";
  const currentRound = tournament?.currentRound;
  const roundNumber = resolveTournamentRoundNumber(roundDisplay, currentRound);
  return { tournament, roundDisplay, currentRound, roundNumber };
}

export async function prefetchTournamentShell(queryClient: QueryClient) {
  await prefetchActiveEvent(queryClient, DEFAULT_SPORT_ID);
}

export async function prefetchActiveTournamentLive(queryClient: QueryClient, eventId: string) {
  const { queryKeys } = await import("../utils/queryKeys");
  const apiClient = (await import("../utils/apiClient")).default;
  await queryClient.prefetchQuery({
    queryKey: queryKeys.sports.candidates(DEFAULT_SPORT_ID, eventId),
    queryFn: async () => {
      const data = await apiClient.get<{ candidates: import("@cut/sport-sdk").Candidate[] }>(
        `/sports/${DEFAULT_SPORT_ID}/events/${eventId}/candidates`,
      );
      return data.candidates;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export async function prefetchActiveTournament(queryClient: QueryClient) {
  await prefetchActiveEvent(queryClient, DEFAULT_SPORT_ID);
  const { queryKeys } = await import("../utils/queryKeys");
  const active = queryClient.getQueryData<{ event: { id: string } }>(
    queryKeys.sports.activeEvent(DEFAULT_SPORT_ID),
  );
  if (active?.event?.id) {
    await prefetchActiveTournamentLive(queryClient, active.event.id);
  }
}

// Re-export for any code still importing mergeTournament from this module.
export { mergeTournament };
