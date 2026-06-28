import { useCallback, useSyncExternalStore } from "react";
import type { PlatformLineupListItem } from "../../src/types/lineup";
import type { PlatformLineupPick } from "../../src/types/event";
import {
  buildLineupPicksByEventParticipantIds,
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

export function resetStorybookLineups(eventParticipantIds: string[] = []) {
  lineupsSnapshot = createStorybookLineupsList(eventParticipantIds);
  emitChange();
}

export function useLineupData(_options: { eventId: string; enabled?: boolean }) {
  const lineups = useSyncExternalStore(subscribe, getSnapshot);

  const updateLineup = useCallback(
    async (
      lineupId: string,
      picks: string[],
      options?: { predictionValue?: number },
    ) => {
      const lineupPicks = buildLineupPicksByEventParticipantIds(picks);
      const score = lineupPicks.reduce((sum, pick) => sum + (pick.total ?? 0), 0);
      lineupsSnapshot = lineupsSnapshot.map((lineup) =>
        lineup.id === lineupId
          ? {
              ...lineup,
              picks: lineupPicks,
              score,
              ...(options?.predictionValue !== undefined
                ? { prediction: { type: "winningLineupTotal", value: options.predictionValue } }
                : {}),
            }
          : lineup,
      );
      emitChange();
      const updated = lineupsSnapshot.find((entry) => entry.id === lineupId);
      return {
        id: lineupId,
        eventId: updated?.eventId ?? "",
        name: updated?.name ?? "Lineup #1",
        prediction: updated?.prediction ?? null,
        picks: lineupPicks,
        score,
        createdAt: updated?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    [],
  );

  const getLineupFromCache = useCallback(
    (lineupId: string): PlatformLineupListItem | null =>
      lineupsSnapshot.find((lineup) => lineup.id === lineupId) ?? null,
    [],
  );

  const getLineupById = useCallback(async (lineupId: string): Promise<PlatformLineupListItem> => {
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

export type { PlatformLineupPick };
