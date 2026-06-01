import { useCallback, useSyncExternalStore } from "react";
import type { TournamentLineupListItem } from "../../src/types/lineup";
import {
  buildLineupPlayersByIds,
  createStorybookLineupsList,
  STORYBOOK_LINEUP_ID,
} from "../../src/test/fixtures/lineupContestCardMock";

let lineupsSnapshot = createStorybookLineupsList();
const subscribers = new Set<() => void>();

function emitChange() {
  subscribers.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function getSnapshot() {
  return lineupsSnapshot;
}

/** Storybook-only reset so each story starts from a known roster. */
export function resetStorybookLineups(playerIds: string[] = []) {
  lineupsSnapshot = createStorybookLineupsList(playerIds);
  emitChange();
}

export function useLineupData(_options: { tournamentId?: string; enabled?: boolean } = {}) {
  const lineups = useSyncExternalStore(subscribe, getSnapshot);

  const updateLineup = useCallback(
    async (
      lineupId: string,
      playerIds: string[],
      options?: { winningScorePrediction?: number },
    ) => {
      const players = buildLineupPlayersByIds(playerIds);
      lineupsSnapshot = lineupsSnapshot.map((lineup) =>
        lineup.id === lineupId
          ? {
              ...lineup,
              players,
              ...(options?.winningScorePrediction !== undefined
                ? { winningScorePrediction: options.winningScorePrediction }
                : {}),
            }
          : lineup,
      );
      emitChange();
      const updated = lineupsSnapshot.find((entry) => entry.id === lineupId);
      return {
        id: lineupId,
        name: updated?.name ?? "Lineup #1",
        players,
        winningScorePrediction: updated?.winningScorePrediction,
      };
    },
    [],
  );

  const getLineupFromCache = useCallback(
    (lineupId: string): TournamentLineupListItem | null =>
      lineupsSnapshot.find((lineup) => lineup.id === lineupId) ?? null,
    [],
  );

  const getLineupById = useCallback(async (lineupId: string): Promise<TournamentLineupListItem> => {
    const lineup = getLineupFromCache(lineupId);
    if (!lineup) {
      throw new Error(`Lineup ${lineupId} not found`);
    }
    return lineup;
  }, [getLineupFromCache]);

  const refetchLineups = useCallback(async () => lineupsSnapshot, []);

  const createLineup = useCallback(async () => {
    throw new Error("createLineup is not mocked in Storybook");
  }, []);

  const clearLineups = useCallback(() => {
    lineupsSnapshot = createStorybookLineupsList();
    emitChange();
  }, []);

  return {
    lineups,
    lineupError: null,
    isLoading: false,
    refetchLineups,
    getLineupById,
    getLineupFromCache,
    createLineup,
    updateLineup,
    clearLineups,
  };
}

export const STORYBOOK_DEFAULT_LINEUP_ID = STORYBOOK_LINEUP_ID;
