import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Contest, type CreateContestInput } from "../types/contest";
import { type ContestLineup } from "../types/lineup";

interface JoinContestParams {
  contestId: string;
  lineupId?: string;
  /** @deprecated Use lineupId */
  tournamentLineupId?: string;
  entryId: string;
}

interface LeaveContestParams {
  contestId: string;
  contestLineupId: string;
}

/**
 * Mutation hook for creating a contest
 */
export function useCreateContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateContestInput) => {
      const { settings, tournamentId, ...rest } = params;
      const eventId = rest.eventId ?? tournamentId;
      if (!eventId) {
        throw new Error("Event ID is required");
      }
      return await apiClient.post<Contest>("/contests", {
        ...rest,
        eventId,
        endDate: settings.expiryTimestamp * 1000,
        settings,
      });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contests.byEvent(
          variables.eventId ?? variables.tournamentId ?? "",
          variables.chainId,
        ),
      });
    },

    onError: (err) => {
      console.error("Failed to create contest:", err);
    },
  });
}

/**
 * Mutation hook for joining a contest
 */
export function useJoinContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, lineupId, tournamentLineupId, entryId }: JoinContestParams) => {
      const resolvedLineupId = lineupId ?? tournamentLineupId;
      if (!resolvedLineupId) {
        throw new Error("Lineup ID is required");
      }
      return await apiClient.post<Contest>(`/contests/${contestId}/lineups`, {
        lineupId: resolvedLineupId,
        entryId,
      });
    },

    onMutate: async ({ contestId, lineupId, tournamentLineupId }) => {
      const resolvedLineupId = lineupId ?? tournamentLineupId;
      await queryClient.cancelQueries({ queryKey: queryKeys.contests.byId(contestId) });

      const previousContest = queryClient.getQueryData<Contest>(queryKeys.contests.byId(contestId));

      if (previousContest) {
        queryClient.setQueryData<Contest>(queryKeys.contests.byId(contestId), (old) => {
          if (!old) return old;

          const optimisticLineup: ContestLineup = {
            id: `temp-${Date.now()}`,
            contestId,
            lineupId: resolvedLineupId,
            tournamentLineupId: resolvedLineupId,
            userId: "",
            status: "ACTIVE",
            position: 0,
            score: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return {
            ...old,
            contestLineups: [...(old.contestLineups || []), optimisticLineup],
          };
        });
      }

      return { previousContest };
    },

    onError: (err, { contestId }, context) => {
      console.error("Failed to join contest:", err);
      if (context?.previousContest) {
        queryClient.setQueryData(queryKeys.contests.byId(contestId), context.previousContest);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.contests() });
    },
  });
}

/**
 * Mutation hook for leaving a contest
 */
export function useLeaveContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, contestLineupId }: LeaveContestParams) => {
      return await apiClient.delete<Contest>(`/contests/${contestId}/lineups/${contestLineupId}`);
    },

    onMutate: async ({ contestId, contestLineupId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contests.byId(contestId) });

      const previousContest = queryClient.getQueryData<Contest>(queryKeys.contests.byId(contestId));

      if (previousContest) {
        queryClient.setQueryData<Contest>(queryKeys.contests.byId(contestId), (old) => {
          if (!old) return old;

          return {
            ...old,
            contestLineups: (old.contestLineups || []).filter(
              (lineup) => lineup.id !== contestLineupId,
            ),
          };
        });
      }

      return { previousContest };
    },

    onError: (err, { contestId }, context) => {
      console.error("Failed to leave contest:", err);
      if (context?.previousContest) {
        queryClient.setQueryData(queryKeys.contests.byId(contestId), context.previousContest);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.contests() });
    },
  });
}

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
