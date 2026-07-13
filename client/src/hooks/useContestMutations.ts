import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import {
  type Contest,
  type ContestDirectoryResponse,
  type CreateContestInput,
} from "../types/contest";
import { type ContestLineup } from "../types/lineup";
import { normalizeContestAddress } from "../utils/contestRoutes";

interface JoinContestParams {
  contestId: string;
  contestAddress: string;
  lineupId: string;
  entryId: string;
}

interface LeaveContestParams {
  contestId: string;
  contestAddress: string;
  contestLineupId: string;
}

type DirectorySnapshot = Array<[readonly unknown[], ContestDirectoryResponse | undefined]>;

function lobbyQueryKey(contestAddress: string) {
  return queryKeys.contests.byLobbyRoute(normalizeContestAddress(contestAddress));
}

function snapshotDirectoryCaches(queryClient: QueryClient): DirectorySnapshot {
  return queryClient.getQueriesData<ContestDirectoryResponse>({
    queryKey: [...queryKeys.contests.all, "directory"],
  });
}

function patchDirectoryContestLineups(
  queryClient: QueryClient,
  contestAddress: string,
  updateLineups: (lineups: ContestLineup[] | undefined) => ContestLineup[] | undefined,
): void {
  const normalized = normalizeContestAddress(contestAddress);
  const sections = ["upcoming", "live", "past"] as const;

  for (const [key, data] of snapshotDirectoryCaches(queryClient)) {
    if (!data) continue;
    let changed = false;
    const next: ContestDirectoryResponse = {
      upcoming: data.upcoming,
      live: data.live,
      past: data.past,
    };

    for (const section of sections) {
      next[section] = data[section].map((group) => {
        const contestIndex = group.contests.findIndex(
          (entry) => normalizeContestAddress(entry.address) === normalized,
        );
        if (contestIndex < 0) return group;
        changed = true;
        const contests = [...group.contests];
        const contest = contests[contestIndex]!;
        contests[contestIndex] = {
          ...contest,
          contestLineups: updateLineups(contest.contestLineups),
        };
        return { ...group, contests };
      });
    }

    if (changed) {
      queryClient.setQueryData(key, next);
    }
  }
}

function restoreDirectoryCaches(queryClient: QueryClient, snapshot: DirectorySnapshot): void {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
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
        queryKey: queryKeys.contests.byEvent(variables.eventId, variables.chainId),
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

    onMutate: async ({ contestAddress, contestId, lineupId }) => {
      const lobbyKey = lobbyQueryKey(contestAddress);
      await queryClient.cancelQueries({ queryKey: lobbyKey });
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.contests.all, "directory"],
      });

      const previousLobby = queryClient.getQueryData<Contest>(lobbyKey);
      const previousDirectories = snapshotDirectoryCaches(queryClient);

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

      if (previousLobby) {
        queryClient.setQueryData<Contest>(lobbyKey, {
          ...previousLobby,
          contestLineups: [...(previousLobby.contestLineups || []), optimisticLineup],
        });
      }

      patchDirectoryContestLineups(queryClient, contestAddress, (lineups) => [
        ...(lineups || []),
        optimisticLineup,
      ]);

      return { previousLobby, previousDirectories, lobbyKey };
    },

    onError: (err, _vars, context) => {
      console.error("Failed to join contest:", err);
      if (!context) return;
      if (context.previousLobby) {
        queryClient.setQueryData(context.lobbyKey, context.previousLobby);
      }
      restoreDirectoryCaches(queryClient, context.previousDirectories);
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

    onMutate: async ({ contestAddress, contestLineupId }) => {
      const lobbyKey = lobbyQueryKey(contestAddress);
      await queryClient.cancelQueries({ queryKey: lobbyKey });
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.contests.all, "directory"],
      });

      const previousLobby = queryClient.getQueryData<Contest>(lobbyKey);
      const previousDirectories = snapshotDirectoryCaches(queryClient);

      if (previousLobby) {
        queryClient.setQueryData<Contest>(lobbyKey, {
          ...previousLobby,
          contestLineups: (previousLobby.contestLineups || []).filter(
            (lineup) => lineup.id !== contestLineupId,
          ),
        });
      }

      patchDirectoryContestLineups(queryClient, contestAddress, (lineups) =>
        (lineups || []).filter((lineup) => lineup.id !== contestLineupId),
      );

      return { previousLobby, previousDirectories, lobbyKey };
    },

    onError: (err, _vars, context) => {
      console.error("Failed to leave contest:", err);
      if (!context) return;
      if (context.previousLobby) {
        queryClient.setQueryData(context.lobbyKey, context.previousLobby);
      }
      restoreDirectoryCaches(queryClient, context.previousDirectories);
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
