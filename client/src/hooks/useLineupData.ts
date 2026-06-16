import { useCallback, useMemo } from "react";

import { useLineupsQuery } from "./useLineupQueries";
import { useCreateLineup, useUpdateLineup } from "./useLineupMutations";
import { useAuth } from "../contexts/AuthContext";
import type { PlatformLineupListItem } from "../types/lineup";

interface UseLineupDataOptions {
  eventId: string;
  enabled?: boolean;
}

export function useLineupData({ eventId, enabled }: UseLineupDataOptions) {
  const { user } = useAuth();
  const isEnabled = enabled ?? Boolean(user && eventId);

  const {
    data: lineups = [],
    error,
    isLoading,
    refetch,
  } = useLineupsQuery(eventId, isEnabled, user?.id);

  const createMutation = useCreateLineup();
  const updateMutation = useUpdateLineup();

  const refetchLineups = useCallback(async (): Promise<PlatformLineupListItem[]> => {
    const result = await refetch();
    return result.data ?? [];
  }, [refetch]);

  const getLineupFromCache = useCallback(
    (lineupId: string): PlatformLineupListItem | null =>
      lineups.find((lineup) => lineup.id === lineupId) ?? null,
    [lineups],
  );

  const getLineupById = useCallback(
    async (lineupId: string): Promise<PlatformLineupListItem> => {
      const lineup = getLineupFromCache(lineupId);
      if (!lineup) {
        throw new Error(`Lineup ${lineupId} not found`);
      }
      return lineup;
    },
    [getLineupFromCache],
  );

  const createLineup = useCallback(
    async (createEventId: string, playerIds: string[], name?: string) => {
      return await createMutation.mutateAsync({
        eventId: createEventId,
        playerIds,
        name,
      });
    },
    [createMutation],
  );

  const updateLineup = useCallback(
    async (
      lineupId: string,
      playerIds: string[],
      options?: { name?: string; winningScorePrediction?: number },
    ) => {
      return await updateMutation.mutateAsync({
        lineupId,
        playerIds,
        name: options?.name,
        winningScorePrediction: options?.winningScorePrediction,
      });
    },
    [updateMutation],
  );

  const lineupError = useMemo(() => {
    if (!error) return null;
    return error instanceof Error ? error.message : "Failed to fetch lineups";
  }, [error]);

  const clearLineups = () => {
    // React Query cache will be cleared automatically on auth/event change
  };

  return {
    lineups,
    lineupError,
    isLoading,
    refetchLineups,
    getLineupById,
    getLineupFromCache,
    createLineup,
    updateLineup,
    clearLineups,
  };
}
