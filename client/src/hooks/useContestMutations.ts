import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Contest, type CreateContestInput } from "../types/contest";
import { type ContestLineup } from "../types/lineup";

interface JoinContestParams {
  contestId: string;
  lineupId: string;
  entryId: string;
}

interface LeaveContestParams {
  contestId: string;
  contestLineupId: string;
}

export function useCreateContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateContestInput) => {
      const { settings, ...rest } = params;
      return await apiClient.post<Contest>("/contests", {
        ...rest,
        endDate: settings.expiryTimestamp * 1000,
        settings,
      });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contests.byEvent(
          variables.eventId,
          variables.chainId,
        ),
      });
    },

    onError: (err) => {
      console.error("Failed to create contest:", err);
    },
  });
}

export function useJoinContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, lineupId, entryId }: JoinContestParams) => {
      return await apiClient.post<Contest>(`/contests/${contestId}/lineups`, {
        lineupId,
        entryId,
      });
    },

    onMutate: async ({ contestId, lineupId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contests.byId(contestId) });

      const previousContest = queryClient.getQueryData<Contest>(queryKeys.contests.byId(contestId));

      if (previousContest) {
        queryClient.setQueryData<Contest>(queryKeys.contests.byId(contestId), (old) => {
          if (!old) return old;

          const optimisticLineup: ContestLineup = {
            id: `temp-${Date.now()}`,
            contestId,
            lineupId,
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
