import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Contest, type CreateContestInput } from "../types/contest";
import { type ContestLineup } from "../types/lineup";

interface JoinContestParams {
  contestId: string;
  tournamentLineupId: string;
}

interface LeaveContestParams {
  contestId: string;
  contestLineupId: string;
}

/**
 * Mutation hook for creating a contest
 *
 * Features:
 * - Automatic cache invalidation on success
 * - Error handling
 * - Better UX with instant feedback
 */
export function useCreateContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateContestInput) => {
      return await apiClient.post<Contest>("/contests", params);
    },

    // Always refetch after success to ensure data is in sync
    onSuccess: (_data, variables) => {
      // Invalidate all contest queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });

      // Invalidate tournament-specific contest queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.contests.byTournament(variables.tournamentId, variables.chainId),
      });

      // Also invalidate tournament data as it includes contest counts
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.active() });
    },

    onError: (err) => {
      console.error("Failed to create contest:", err);
    },
  });
}

/**
 * Mutation hook for joining a contest
 *
 * Features:
 * - Optimistic updates: UI updates immediately before server confirms
 * - Automatic rollback on error
 * - Cache invalidation on success
 * - Better UX with instant feedback
 */
export function useJoinContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, tournamentLineupId }: JoinContestParams) => {
      return await apiClient.post<Contest>(`/contests/${contestId}/lineups`, {
        tournamentLineupId,
      });
    },

    // Optimistic update: Update UI before server responds
    onMutate: async ({ contestId, tournamentLineupId }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.contests.byId(contestId) });

      // Snapshot the previous value
      const previousContest = queryClient.getQueryData<Contest>(queryKeys.contests.byId(contestId));

      // Optimistically update to show the new lineup
      if (previousContest) {
        queryClient.setQueryData<Contest>(queryKeys.contests.byId(contestId), (old) => {
          if (!old) return old;

          // Create a temporary contest lineup entry (server will provide the real one)
          const optimisticLineup: ContestLineup = {
            id: `temp-${Date.now()}`, // Temporary ID
            contestId,
            tournamentLineupId,
            userId: "", // Will be filled by server
            status: "ACTIVE",
            position: 0, // Temporary position
            score: 0, // Temporary score
            createdAt: new Date(),
            updatedAt: new Date(),
            // Note: Real data will come from server
          };

          return {
            ...old,
            contestLineups: [...(old.contestLineups || []), optimisticLineup],
          };
        });
      }

      // Return context with the snapshot
      return { previousContest };
    },

    // If mutation fails, rollback to the previous value
    onError: (err, { contestId }, context) => {
      console.error("Failed to join contest:", err);
      if (context?.previousContest) {
        queryClient.setQueryData(queryKeys.contests.byId(contestId), context.previousContest);
      }
    },

    // Always refetch after success to ensure data is in sync with server
    onSuccess: (data, { contestId }) => {
      // Update the cache with the real server data
      queryClient.setQueryData(queryKeys.contests.byId(contestId), data);

      // Also invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.all });
    },
  });
}

/**
 * Mutation hook for leaving a contest
 *
 * Features:
 * - Optimistic updates: Removes lineup from UI immediately
 * - Automatic rollback on error
 * - Cache invalidation on success
 */
export function useLeaveContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, contestLineupId }: LeaveContestParams) => {
      return await apiClient.delete<Contest>(`/contests/${contestId}/lineups/${contestLineupId}`);
    },

    // Optimistic update: Remove lineup from UI before server responds
    onMutate: async ({ contestId, contestLineupId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.contests.byId(contestId) });

      // Snapshot the previous value
      const previousContest = queryClient.getQueryData<Contest>(queryKeys.contests.byId(contestId));

      // Optimistically remove the lineup
      if (previousContest) {
        queryClient.setQueryData<Contest>(queryKeys.contests.byId(contestId), (old) => {
          if (!old) return old;

          return {
            ...old,
            contestLineups: (old.contestLineups || []).filter(
              (lineup) => lineup.id !== contestLineupId
            ),
          };
        });
      }

      // Return context with the snapshot
      return { previousContest };
    },

    // If mutation fails, rollback to the previous value
    onError: (err, { contestId }, context) => {
      console.error("Failed to leave contest:", err);
      if (context?.previousContest) {
        queryClient.setQueryData(queryKeys.contests.byId(contestId), context.previousContest);
      }
    },

    // Always refetch after success to ensure data is in sync
    onSuccess: (data, { contestId }) => {
      // Update the cache with the real server data
      queryClient.setQueryData(queryKeys.contests.byId(contestId), data);

      // Also invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.all });
    },
  });
}

/**
 * Combined hook that provides create, join, and leave mutations
 *
 * Usage:
 * ```typescript
 * const { create, join, leave } = useContestActions();
 *
 * // Create contest
 * create.mutate({ name: "My Contest", tournamentId: "123", ... });
 *
 * // Join contest
 * join.mutate({ contestId: "123", tournamentLineupId: "456" });
 *
 * // Leave contest
 * leave.mutate({ contestId: "123", contestLineupId: "789" });
 * ```
 */
export function useContestActions() {
  const create = useCreateContest();
  const join = useJoinContest();
  const leave = useLeaveContest();

  return {
    create,
    join,
    leave,
    isLoading: create.isPending || join.isPending || leave.isPending,
  };
}
