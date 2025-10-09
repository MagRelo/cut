import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type TournamentLineup } from "../types/player";

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

/**
 * Mutation hook for creating a lineup
 *
 * Features:
 * - Optimistic updates: UI updates immediately before server confirms
 * - Automatic rollback on error
 * - Cache invalidation on success
 * - Better UX with instant feedback
 */
export function useCreateLineup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tournamentId, playerIds, name }: CreateLineupParams) => {
      const data = await apiClient.post<LineupResponse>(`/lineup/${tournamentId}`, {
        players: playerIds,
        name,
      });
      return data.lineups[0];
    },

    // Optimistic update: Add lineup to cache before server responds
    onMutate: async ({ tournamentId, playerIds, name }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byTournament(tournamentId) });

      // Snapshot the previous value
      const previousLineups = queryClient.getQueryData<TournamentLineup[]>(
        queryKeys.lineups.byTournament(tournamentId)
      );

      // Optimistically add the new lineup
      if (previousLineups !== undefined) {
        const optimisticLineup: TournamentLineup = {
          id: `temp-${Date.now()}`,
          name: name || "New Lineup",
          tournamentId,
          userId: "",
          players: [], // Will be populated by server
          score: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TournamentLineup;

        queryClient.setQueryData<TournamentLineup[]>(
          queryKeys.lineups.byTournament(tournamentId),
          [...previousLineups, optimisticLineup]
        );
      }

      return { previousLineups, tournamentId };
    },

    // If mutation fails, rollback
    onError: (err, { tournamentId }, context) => {
      console.error("Failed to create lineup:", err);
      if (context?.previousLineups !== undefined) {
        queryClient.setQueryData(
          queryKeys.lineups.byTournament(tournamentId),
          context.previousLineups
        );
      }
    },

    // Always refetch after success
    onSuccess: (data, { tournamentId }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byTournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.all });
      
      // Also invalidate contests that might include this lineup
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
    },
  });
}

/**
 * Mutation hook for updating a lineup
 *
 * Features:
 * - Optimistic updates: Changes visible immediately
 * - Automatic rollback on error
 * - Cache invalidation on success
 */
export function useUpdateLineup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lineupId, playerIds, name }: UpdateLineupParams) => {
      const data = await apiClient.put<LineupResponse>(`/lineup/${lineupId}`, {
        players: playerIds,
        name,
      });
      return data.lineups[0];
    },

    // Optimistic update: Update lineup in cache before server responds
    onMutate: async ({ lineupId, playerIds, name }) => {
      // Get the lineup to find its tournament ID
      const lineupData = queryClient.getQueryData<TournamentLineup>(
        queryKeys.lineups.byId(lineupId)
      );
      const tournamentId = lineupData?.tournamentId;

      if (!tournamentId) {
        // If we don't know the tournament ID, we can't do optimistic updates
        return { previousLineups: undefined, previousLineup: undefined };
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byTournament(tournamentId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byId(lineupId) });

      // Snapshot the previous values
      const previousLineups = queryClient.getQueryData<TournamentLineup[]>(
        queryKeys.lineups.byTournament(tournamentId)
      );
      const previousLineup = queryClient.getQueryData<TournamentLineup>(
        queryKeys.lineups.byId(lineupId)
      );

      // Optimistically update the lineup in the list
      if (previousLineups) {
        queryClient.setQueryData<TournamentLineup[]>(
          queryKeys.lineups.byTournament(tournamentId),
          previousLineups.map((lineup) =>
            lineup.id === lineupId
              ? {
                  ...lineup,
                  name: name || lineup.name,
                  updatedAt: new Date(),
                  // Note: players will be updated by server response
                }
              : lineup
          )
        );
      }

      // Optimistically update the single lineup cache
      if (previousLineup) {
        queryClient.setQueryData<TournamentLineup>(queryKeys.lineups.byId(lineupId), {
          ...previousLineup,
          name: name || previousLineup.name,
          updatedAt: new Date(),
        });
      }

      return { previousLineups, previousLineup, tournamentId, lineupId };
    },

    // If mutation fails, rollback
    onError: (err, variables, context) => {
      console.error("Failed to update lineup:", err);
      if (context?.tournamentId && context?.previousLineups) {
        queryClient.setQueryData(
          queryKeys.lineups.byTournament(context.tournamentId),
          context.previousLineups
        );
      }
      if (context?.lineupId && context?.previousLineup) {
        queryClient.setQueryData(queryKeys.lineups.byId(context.lineupId), context.previousLineup);
      }
    },

    // Always refetch after success
    onSuccess: (data, { lineupId }) => {
      const tournamentId = data.tournamentId;

      // Update the specific lineup in cache
      queryClient.setQueryData(queryKeys.lineups.byId(lineupId), data);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byTournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.all });
      
      // Also invalidate contests that might include this lineup
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
    },
  });
}

/**
 * Combined hook that provides both create and update mutations
 *
 * Usage:
 * ```typescript
 * const { create, update } = useLineupActions();
 *
 * // Create lineup
 * create.mutate({ tournamentId: "123", playerIds: ["1", "2", "3", "4"] });
 *
 * // Update lineup
 * update.mutate({ lineupId: "456", playerIds: ["5", "6", "7", "8"] });
 * ```
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

