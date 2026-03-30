import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type TournamentLineup } from "../types/player";
import { useAuth } from "../contexts/AuthContext";

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

/** Find which tournament list cache contains this lineup (for optimistic updates). */
function findLineupListContext(
  queryClient: QueryClient,
  lineupId: string
): { userId: string; tournamentId: string } | null {
  const entries = queryClient.getQueriesData<TournamentLineup[]>({
    queryKey: queryKeys.lineups.all,
  });
  for (const [queryKey, lineups] of entries) {
    if (!lineups?.some((l) => l.id === lineupId)) continue;
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

      const previousLineups = queryClient.getQueryData<TournamentLineup[]>(
        queryKeys.lineups.byTournament(userId, tournamentId)
      );

      if (previousLineups !== undefined) {
        const optimisticLineup: TournamentLineup = {
          id: `temp-${Date.now()}`,
          name: name || "New Lineup",
          players: [],
        };

        queryClient.setQueryData<TournamentLineup[]>(
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

    onSuccess: (_data, { tournamentId }) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byTournament(userId, tournamentId) });
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

    onMutate: async ({ lineupId, name }) => {
      const ctx = findLineupListContext(queryClient, lineupId);
      if (!ctx) {
        return { previousLineups: undefined, tournamentId: undefined as string | undefined, lineupId };
      }

      const { userId: uid, tournamentId } = ctx;

      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byTournament(uid, tournamentId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.lineups.byId(uid, lineupId) });

      const previousLineups = queryClient.getQueryData<TournamentLineup[]>(
        queryKeys.lineups.byTournament(uid, tournamentId)
      );

      if (previousLineups) {
        queryClient.setQueryData<TournamentLineup[]>(
          queryKeys.lineups.byTournament(uid, tournamentId),
          previousLineups.map((lineup) =>
            lineup.id === lineupId
              ? {
                  ...lineup,
                  name: name || lineup.name,
                }
              : lineup
          )
        );
      }

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

    onSuccess: (data) => {
      const tid = data?.players?.[0]?.tournamentId;
      if (userId) {
        if (tid) {
          queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byTournament(userId, tid) });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.lineups.byId(userId, data.id) });
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
