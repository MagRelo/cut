import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type PlayerWithTournamentData, type TournamentLineup } from "../types/player";
import type { TournamentLineupListItem } from "../types/lineup";
import type { SideBetMarketResponse } from "../types/sideBet";
import { useAuth } from "../contexts/AuthContext";
import { captureLineupCreated, captureLineupUpdated } from "../lib/analytics/posthog";
import type { ActiveTournamentLiveResponse } from "./useTournamentData";

interface LineupResponse {
  lineups: TournamentLineup[];
}

interface CreateLineupParams {
  tournamentId: string;
  playerIds: string[];
  name?: string;
}

interface UpdateLineupParams {
  lineupId: string;
  playerIds: string[];
  name?: string;
}

function buildPlayersFromIds(
  queryClient: QueryClient,
  tournamentId: string,
  playerIds: string[],
  lineups: TournamentLineupListItem[],
): PlayerWithTournamentData[] {
  const playerMap = new Map<string, PlayerWithTournamentData>();

  const fieldData = queryClient.getQueryData<ActiveTournamentLiveResponse>(
    queryKeys.tournaments.activeLive(tournamentId),
  );
  for (const player of fieldData?.players ?? []) {
    if (!playerMap.has(player.id)) {
      playerMap.set(player.id, player);
    }
  }

  for (const lineup of lineups) {
    for (const player of lineup.players ?? []) {
      if (!playerMap.has(player.id)) {
        playerMap.set(player.id, player);
      }
    }
  }

  return playerIds
    .map((id) => playerMap.get(id))
    .filter((p): p is PlayerWithTournamentData => p !== undefined);
}

/** Clears stale parlay odds in cache immediately when the roster changes. */
function resetSideBetMarketCache(queryClient: QueryClient, lineupId: string) {
  const previous = queryClient.getQueryData<SideBetMarketResponse>(
    queryKeys.sideBet.market(lineupId),
  );
  queryClient.setQueryData<SideBetMarketResponse>(queryKeys.sideBet.market(lineupId), {
    bettable: false,
    marketStatus: "UNAVAILABLE",
    unavailableReason: "ROSTER_CHANGED",
    quoteVersion: 0,
    selections: [],
    tickets: previous?.tickets ?? [],
  });
}

function invalidateSideBetQueries(queryClient: QueryClient, lineupId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.sideBet.market(lineupId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.sideBet.tickets(lineupId) });
}

/** Find which tournament list cache contains this lineup (for optimistic updates). */
function findLineupListContext(
  queryClient: QueryClient,
  lineupId: string
): { userId: string; tournamentId: string } | null {
  const entries = queryClient.getQueriesData<TournamentLineupListItem[]>({
    queryKey: queryKeys.lineups.all,
  });
  for (const [queryKey, lineups] of entries) {
    // List queries store TournamentLineup[]; detail queries store a single lineup — skip non-arrays.
    if (!Array.isArray(lineups) || !lineups.some((l) => l.id === lineupId)) continue;
    if (
      Array.isArray(queryKey) &&
      queryKey[0] === "lineups" &&
      queryKey[1] === "tournament" &&
      typeof queryKey[2] === "string" &&
      typeof queryKey[3] === "string"
    ) {
      return { userId: queryKey[2], tournamentId: queryKey[3] };
    }
  }
  return null;
}

/**
 * Mutation hook for creating a lineup
 */
export function useCreateLineup() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ tournamentId, playerIds, name }: CreateLineupParams) => {
      const data = await apiClient.post<LineupResponse>(`/lineup/${tournamentId}`, {
        players: playerIds,
        name,
      });
      return data.lineups[0];
    },

    onMutate: async ({ tournamentId, name }) => {
      if (!userId) {
        return { previousLineups: undefined, tournamentId };
      }

      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byTournament(userId, tournamentId) });

      const previousLineups = queryClient.getQueryData<TournamentLineupListItem[]>(
        queryKeys.lineups.byTournament(userId, tournamentId)
      );

      if (previousLineups !== undefined) {
        const optimisticLineup: TournamentLineupListItem = {
          id: `temp-${Date.now()}`,
          name: name || "New Lineup",
          players: [],
          contestLineups: [],
        };

        queryClient.setQueryData<TournamentLineupListItem[]>(
          queryKeys.lineups.byTournament(userId, tournamentId),
          [...previousLineups, optimisticLineup]
        );
      }

      return { previousLineups, tournamentId };
    },

    onError: (err, { tournamentId }, context) => {
      console.error("Failed to create lineup:", err);
      if (context?.previousLineups !== undefined && userId) {
        queryClient.setQueryData(
          queryKeys.lineups.byTournament(userId, tournamentId),
          context.previousLineups
        );
      }
    },

    onSuccess: (data, { tournamentId }, context) => {
      if (userId && data?.id) {
        const isFirstLineup =
          context?.previousLineups === undefined || context.previousLineups.length === 0;
        captureLineupCreated(posthog, {
          user_id: userId,
          tournament_id: tournamentId,
          lineup_id: data.id,
          player_count: Array.isArray(data.players) ? data.players.length : 0,
          is_first_lineup: isFirstLineup,
        });
      }
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byTournament(userId, tournamentId) });
      }
      if (data?.id) {
        resetSideBetMarketCache(queryClient, data.id);
        invalidateSideBetQueries(queryClient, data.id);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
    },
  });
}

/**
 * Mutation hook for updating a lineup
 */
export function useUpdateLineup() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ lineupId, playerIds, name }: UpdateLineupParams) => {
      const data = await apiClient.put<LineupResponse>(`/lineup/${lineupId}`, {
        players: playerIds,
        name,
      });
      return data.lineups[0];
    },

    onMutate: async ({ lineupId, name, playerIds }) => {
      const ctx = findLineupListContext(queryClient, lineupId);
      if (!ctx) {
        return { previousLineups: undefined, tournamentId: undefined as string | undefined, lineupId };
      }

      const { userId: uid, tournamentId } = ctx;

      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byTournament(uid, tournamentId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byId(uid, lineupId) });

      const previousLineups = queryClient.getQueryData<TournamentLineupListItem[]>(
        queryKeys.lineups.byTournament(uid, tournamentId)
      );

      if (previousLineups) {
        const optimisticPlayers = buildPlayersFromIds(
          queryClient,
          tournamentId,
          playerIds,
          previousLineups,
        );
        queryClient.setQueryData<TournamentLineupListItem[]>(
          queryKeys.lineups.byTournament(uid, tournamentId),
          previousLineups.map((lineup) =>
            lineup.id === lineupId
              ? {
                  ...lineup,
                  name: name || lineup.name,
                  players: optimisticPlayers,
                }
              : lineup
          )
        );
      }

      resetSideBetMarketCache(queryClient, lineupId);
      await queryClient.cancelQueries({ queryKey: queryKeys.sideBet.market(lineupId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.sideBet.tickets(lineupId) });

      return { previousLineups, tournamentId, lineupId, userId: uid };
    },

    onError: (err, _variables, context) => {
      console.error("Failed to update lineup:", err);
      if (context?.tournamentId && context?.previousLineups && context?.userId) {
        queryClient.setQueryData(
          queryKeys.lineups.byTournament(context.userId, context.tournamentId),
          context.previousLineups
        );
      }
    },

    onSuccess: (data, _variables, context) => {
      const tid =
        data?.players?.[0]?.tournamentId ?? context?.tournamentId;
      if (userId && data?.id && tid) {
        captureLineupUpdated(posthog, {
          user_id: userId,
          lineup_id: data.id,
          tournament_id: tid,
        });
      }
      if (userId && context?.tournamentId && data?.id && Array.isArray(data.players)) {
        queryClient.setQueryData<TournamentLineupListItem[]>(
          queryKeys.lineups.byTournament(userId, context.tournamentId),
          (current) =>
            current?.map((lineup) =>
              lineup.id === data.id
                ? {
                    ...lineup,
                    players: data.players,
                  }
                : lineup,
            ) ?? current,
        );
      }
      if (userId) {
        if (tid) {
          queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byTournament(userId, tid) });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byId(userId, data.id) });
      }
      if (data?.id) {
        resetSideBetMarketCache(queryClient, data.id);
        invalidateSideBetQueries(queryClient, data.id);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
    },
  });
}

/**
 * Combined hook that provides both create and update mutations
 */
export function useLineupActions() {
  const create = useCreateLineup();
  const update = useUpdateLineup();

  return {
    create,
    update,
    isLoading: create.isPending || update.isPending,
  };
}
