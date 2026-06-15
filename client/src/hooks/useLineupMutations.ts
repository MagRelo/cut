import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import type { Candidate } from "@cut/sport-sdk";
import { queryKeys } from "../utils/queryKeys";
import type { PlatformLineupListItem } from "../types/lineup";
import type { SideBetMarketResponse } from "../types/sideBet";
import { useAuth } from "../contexts/AuthContext";
import { captureLineupCreated, captureLineupUpdated } from "../lib/analytics/posthog";
import {
  createLineupForEvent,
  resolveEventParticipantIds,
  updateLineupById,
} from "../lib/lineupApi";
import { useSportContext } from "../contexts/SportContext";
import {
  buildOptimisticPicks,
  platformLineupParticipantIds,
  platformLineupPrediction,
} from "../lib/lineupUtils";

interface CreateLineupParams {
  eventId: string;
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
  const entries = queryClient.getQueriesData<PlatformLineupListItem[]>({
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

function getCandidates(
  queryClient: QueryClient,
  sportId: string,
  eventId: string,
): Candidate[] {
  return queryClient.getQueryData<Candidate[]>(queryKeys.sports.candidates(sportId, eventId)) ?? [];
}

export function useCreateLineup() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const { user } = useAuth();
  const { sportId } = useSportContext();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({
      eventId,
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

    onMutate: async ({ eventId, name }) => {
      if (!userId) {
        return { previousLineups: undefined, eventId };
      }

      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byEvent(userId, eventId) });

      const previousLineups = queryClient.getQueryData<PlatformLineupListItem[]>(
        queryKeys.lineups.byEvent(userId, eventId),
      );

      if (previousLineups !== undefined) {
        const now = new Date().toISOString();
        const optimisticLineup: PlatformLineupListItem = {
          id: `temp-${Date.now()}`,
          eventId,
          name: name || "New Lineup",
          prediction: null,
          picks: [],
          contestLineups: [],
          createdAt: now,
          updatedAt: now,
        };

        queryClient.setQueryData<PlatformLineupListItem[]>(
          queryKeys.lineups.byEvent(userId, eventId),
          [...previousLineups, optimisticLineup],
        );
      }

      return { previousLineups, eventId };
    },

    onError: (err, { eventId }, context) => {
      console.error("Failed to create lineup:", err);
      if (context?.previousLineups !== undefined && userId) {
        queryClient.setQueryData(
          queryKeys.lineups.byEvent(userId, eventId),
          context.previousLineups,
        );
      }
    },

    onSuccess: (data, { eventId }, context) => {
      if (userId && data?.id) {
        const isFirstLineup =
          context?.previousLineups === undefined || context.previousLineups.length === 0;
        captureLineupCreated(posthog, {
          user_id: userId,
          tournament_id: eventId,
          lineup_id: data.id,
          player_count: data.picks.length,
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
      const candidates = getCandidates(queryClient, sportId, eventId);

      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byEvent(uid, eventId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byId(uid, lineupId) });

      const previousLineups = queryClient.getQueryData<PlatformLineupListItem[]>(
        queryKeys.lineups.byEvent(uid, eventId),
      );

      if (previousLineups) {
        queryClient.setQueryData<PlatformLineupListItem[]>(
          queryKeys.lineups.byEvent(uid, eventId),
          previousLineups.map((lineup) =>
            lineup.id === lineupId
              ? {
                  ...lineup,
                  name: name || lineup.name,
                  picks: buildOptimisticPicks(playerIds, candidates),
                  ...(winningScorePrediction !== undefined
                    ? { prediction: { type: "winningScore", value: winningScorePrediction } }
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
      const eventId = data?.eventId ?? context?.eventId;
      if (userId && data?.id && eventId) {
        captureLineupUpdated(posthog, {
          user_id: userId,
          lineup_id: data.id,
          tournament_id: eventId,
        });
      }
      if (userId && context?.eventId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.lineups.byEvent(userId, context.eventId),
        });
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

// Re-export helpers used by slot editor duplicate checks
export { platformLineupParticipantIds, platformLineupPrediction };
