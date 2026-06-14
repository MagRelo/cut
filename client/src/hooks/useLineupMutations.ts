import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import { queryKeys } from "../utils/queryKeys";
import { type PlayerWithTournamentData } from "../types/player";
import type { TournamentLineupListItem } from "../types/lineup";
import type { SideBetMarketResponse } from "../types/sideBet";
import { useAuth } from "../contexts/AuthContext";
import { captureLineupCreated, captureLineupUpdated } from "../lib/analytics/posthog";
import type { ActiveTournamentLiveResponse } from "./useTournamentData";
import {
  createLineupForEvent,
  resolveEventParticipantIds,
  updateLineupById,
} from "../lib/lineupApi";
import { useSportContext } from "../contexts/SportContext";

interface CreateLineupParams {
  tournamentId: string;
  playerIds: string[];
  name?: string;
  winningScorePrediction?: number;
}

interface UpdateLineupParams {
  lineupId: string;
  playerIds: string[];
  name?: string;
  winningScorePrediction?: number;
}

function buildPlayersFromIds(
  queryClient: QueryClient,
  eventId: string,
  playerIds: string[],
  lineups: TournamentLineupListItem[],
): PlayerWithTournamentData[] {
  const playerMap = new Map<string, PlayerWithTournamentData>();

  const fieldData = queryClient.getQueryData<ActiveTournamentLiveResponse>(
    queryKeys.tournaments.activeLive(eventId),
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

function findLineupListContext(
  queryClient: QueryClient,
  lineupId: string,
): { userId: string; eventId: string } | null {
  const entries = queryClient.getQueriesData<TournamentLineupListItem[]>({
    queryKey: queryKeys.lineups.all,
  });
  for (const [queryKey, lineups] of entries) {
    if (!Array.isArray(lineups) || !lineups.some((lineup) => lineup.id === lineupId)) continue;
    if (
      Array.isArray(queryKey) &&
      queryKey[0] === "lineups" &&
      queryKey[1] === "event" &&
      typeof queryKey[2] === "string" &&
      typeof queryKey[3] === "string"
    ) {
      return { userId: queryKey[2], eventId: queryKey[3] };
    }
  }
  return null;
}

export function useCreateLineup() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const { user } = useAuth();
  const { sportId } = useSportContext();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({
      tournamentId: eventId,
      playerIds,
      name,
      winningScorePrediction,
    }: CreateLineupParams) => {
      const picks = await resolveEventParticipantIds(
        queryClient,
        sportId,
        eventId,
        playerIds,
      );
      return await createLineupForEvent({
        eventId,
        sportId,
        picks,
        name,
        winningScorePrediction,
      });
    },

    onMutate: async ({ tournamentId: eventId, name }) => {
      if (!userId) {
        return { previousLineups: undefined, eventId };
      }

      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byEvent(userId, eventId) });

      const previousLineups = queryClient.getQueryData<TournamentLineupListItem[]>(
        queryKeys.lineups.byEvent(userId, eventId),
      );

      if (previousLineups !== undefined) {
        const optimisticLineup: TournamentLineupListItem = {
          id: `temp-${Date.now()}`,
          name: name || "New Lineup",
          players: [],
          contestLineups: [],
        };

        queryClient.setQueryData<TournamentLineupListItem[]>(
          queryKeys.lineups.byEvent(userId, eventId),
          [...previousLineups, optimisticLineup],
        );
      }

      return { previousLineups, eventId };
    },

    onError: (err, { tournamentId: eventId }, context) => {
      console.error("Failed to create lineup:", err);
      if (context?.previousLineups !== undefined && userId) {
        queryClient.setQueryData(
          queryKeys.lineups.byEvent(userId, eventId),
          context.previousLineups,
        );
      }
    },

    onSuccess: (data, { tournamentId: eventId }, context) => {
      if (userId && data?.id) {
        const isFirstLineup =
          context?.previousLineups === undefined || context.previousLineups.length === 0;
        captureLineupCreated(posthog, {
          user_id: userId,
          tournament_id: eventId,
          lineup_id: data.id,
          player_count: Array.isArray(data.players) ? data.players.length : 0,
          is_first_lineup: isFirstLineup,
        });
      }
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byEvent(userId, eventId) });
      }
      if (data?.id) {
        resetSideBetMarketCache(queryClient, data.id);
        invalidateSideBetQueries(queryClient, data.id);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
    },
  });
}

export function useUpdateLineup() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const { user } = useAuth();
  const { sportId } = useSportContext();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({
      lineupId,
      playerIds,
      name,
      winningScorePrediction,
    }: UpdateLineupParams) => {
      const ctx = findLineupListContext(queryClient, lineupId);
      if (!ctx) {
        throw new Error(`Lineup ${lineupId} not found in cache`);
      }
      const picks = await resolveEventParticipantIds(
        queryClient,
        sportId,
        ctx.eventId,
        playerIds,
      );
      return await updateLineupById({
        lineupId,
        eventId: ctx.eventId,
        sportId,
        picks,
        name,
        winningScorePrediction,
      });
    },

    onMutate: async ({ lineupId, name, playerIds, winningScorePrediction }) => {
      const ctx = findLineupListContext(queryClient, lineupId);
      if (!ctx) {
        return { previousLineups: undefined, eventId: undefined as string | undefined, lineupId };
      }

      const { userId: uid, eventId } = ctx;

      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byEvent(uid, eventId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byId(uid, lineupId) });

      const previousLineups = queryClient.getQueryData<TournamentLineupListItem[]>(
        queryKeys.lineups.byEvent(uid, eventId),
      );

      if (previousLineups) {
        const optimisticPlayers = buildPlayersFromIds(
          queryClient,
          eventId,
          playerIds,
          previousLineups,
        );
        queryClient.setQueryData<TournamentLineupListItem[]>(
          queryKeys.lineups.byEvent(uid, eventId),
          previousLineups.map((lineup) =>
            lineup.id === lineupId
              ? {
                  ...lineup,
                  name: name || lineup.name,
                  players: optimisticPlayers,
                  ...(winningScorePrediction !== undefined
                    ? { winningScorePrediction }
                    : {}),
                }
              : lineup,
          ),
        );
      }

      resetSideBetMarketCache(queryClient, lineupId);
      await queryClient.cancelQueries({ queryKey: queryKeys.sideBet.market(lineupId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.sideBet.tickets(lineupId) });

      return { previousLineups, eventId, lineupId, userId: uid };
    },

    onError: (err, _variables, context) => {
      console.error("Failed to update lineup:", err);
      if (context?.eventId && context?.previousLineups && context?.userId) {
        queryClient.setQueryData(
          queryKeys.lineups.byEvent(context.userId, context.eventId),
          context.previousLineups,
        );
      }
    },

    onSuccess: (data, _variables, context) => {
      const eventId = data?.players?.[0]?.tournamentId ?? context?.eventId;
      if (userId && data?.id && eventId) {
        captureLineupUpdated(posthog, {
          user_id: userId,
          lineup_id: data.id,
          tournament_id: eventId,
        });
      }
      if (userId && context?.eventId && data?.id && Array.isArray(data.players)) {
        queryClient.setQueryData<TournamentLineupListItem[]>(
          queryKeys.lineups.byEvent(userId, context.eventId),
          (current) =>
            current?.map((lineup) =>
              lineup.id === data.id
                ? {
                    ...lineup,
                    players: data.players,
                    winningScorePrediction:
                      data.winningScorePrediction ?? lineup.winningScorePrediction,
                  }
                : lineup,
            ) ?? current,
        );
      }
      if (userId) {
        if (eventId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byEvent(userId, eventId) });
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

export function useLineupActions() {
  const create = useCreateLineup();
  const update = useUpdateLineup();

  return {
    create,
    update,
    isLoading: create.isPending || update.isPending,
  };
}
