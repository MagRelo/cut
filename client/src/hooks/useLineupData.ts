import { useCallback, useMemo } from "react";

import { useLineupsQuery } from "./useLineupQueries";
import { useCreateLineup, useUpdateLineup } from "./useLineupMutations";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useCurrentTournament } from "./useTournamentData";
import { type TournamentLineup } from "../types/player";

interface UseLineupDataOptions {
  tournamentId?: string;
  enabled?: boolean;
}

export function useLineupData(options: UseLineupDataOptions = {}) {
  const { user } = usePortoAuth();
  const { tournament: currentTournament } = useCurrentTournament();

  const tournamentId = options.tournamentId ?? currentTournament?.id;
  const isEnabled = options.enabled ?? (!!user && !!tournamentId);

  const {
    data: lineups = [],
    error,
    isLoading,
    refetch,
  } = useLineupsQuery(tournamentId, isEnabled);

  const createMutation = useCreateLineup();
  const updateMutation = useUpdateLineup();

  const getLineups = useCallback(
    async (_tournamentId: string): Promise<TournamentLineup[]> => {
      const result = await refetch();
      return result.data ?? [];
    },
    [refetch]
  );

  const getLineupFromCache = useCallback(
    (lineupId: string): TournamentLineup | null =>
      lineups.find((lineup) => lineup.id === lineupId) ?? null,
    [lineups]
  );

  const getLineupById = useCallback(
    async (lineupId: string): Promise<TournamentLineup> => {
      const lineup = getLineupFromCache(lineupId);
      if (!lineup) {
        throw new Error(`Lineup ${lineupId} not found`);
      }
      return lineup;
    },
    [getLineupFromCache]
  );

  const createLineup = useCallback(
    async (createTournamentId: string, playerIds: string[], name?: string) => {
      return await createMutation.mutateAsync({
        tournamentId: createTournamentId,
        playerIds,
        name,
      });
    },
    [createMutation]
  );

  const updateLineup = useCallback(
    async (lineupId: string, playerIds: string[], name?: string) => {
      return await updateMutation.mutateAsync({
        lineupId,
        playerIds,
        name,
      });
    },
    [updateMutation]
  );

  const lineupError = useMemo(() => {
    if (!error) return null;
    return error instanceof Error ? error.message : "Failed to fetch lineups";
  }, [error]);

  const clearLineups = () => {
    // React Query cache will be cleared automatically on auth/tournament change
  };

  return {
    lineups,
    lineupError,
    isLoading,
    getLineups,
    getLineupById,
    getLineupFromCache,
    createLineup,
    updateLineup,
    clearLineups,
  };
}


