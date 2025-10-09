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
    onMutate: async ({ tournamentId, name }) => {
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
          players: [], // Will be populated by server
        };

        queryClient.setQueryData<TournamentLineup[]>(queryKeys.lineups.byTournament(tournamentId), [
          ...previousLineups,
          optimisticLineup,
        ]);
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
    onSuccess: (_data, { tournamentId }) => {
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
    onMutate: async ({ lineupId, name }) => {
      // Find tournament ID from the lineups cache
      let tournamentId: string | undefined;
      const allLineupQueries = queryClient.getQueriesData<TournamentLineup[]>({
        queryKey: queryKeys.lineups.all,
      });

      for (const [, lineups] of allLineupQueries) {
        if (lineups) {
          const lineup = lineups.find((l) => l.id === lineupId);
          if (lineup) {
            // Extract tournament ID from query key or use a placeholder
            tournamentId = "current"; // Will be updated by server response
            break;
          }
        }
      }

      if (!tournamentId) {
        return { previousLineups: undefined, previousLineup: undefined };
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byTournament(tournamentId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byId(lineupId) });

      // Snapshot the previous values
      const previousLineups = queryClient.getQueryData<TournamentLineup[]>(
        queryKeys.lineups.byTournament(tournamentId)
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
                  // Note: players will be updated by server response
                }
              : lineup
          )
        );
      }

      return { previousLineups, tournamentId, lineupId };
    },

    // If mutation fails, rollback
    onError: (err, _variables, context) => {
      console.error("Failed to update lineup:", err);
      if (context?.tournamentId && context?.previousLineups) {
        queryClient.setQueryData(
          queryKeys.lineups.byTournament(context.tournamentId),
          context.previousLineups
        );
      }
    },

    // Always refetch after success
    onSuccess: () => {
      // Invalidate all lineup queries to ensure everything is in sync
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
