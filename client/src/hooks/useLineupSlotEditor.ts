import { useCallback, useEffect, useState } from "react";
import type { PlayerWithTournamentData } from "../types/player";
import type { TournamentLineupListItem } from "../types/lineup";
import { DUPLICATE_LINEUP_PREDICTION_MESSAGE } from "../utils/winningScorePrediction";

const SLOT_COUNT = 4;

function padToSlots(players: PlayerWithTournamentData[]): Array<PlayerWithTournamentData | null> {
  const slots: Array<PlayerWithTournamentData | null> = [...players];
  while (slots.length < SLOT_COUNT) {
    slots.push(null);
  }
  return slots.slice(0, SLOT_COUNT);
}

function playerIdsFromSlots(slots: Array<PlayerWithTournamentData | null>): string[] {
  return slots.filter((p): p is PlayerWithTournamentData => p !== null).map((p) => p.id);
}

interface UpdateLineupOptions {
  winningScorePrediction?: number;
}

interface UseLineupSlotEditorOptions {
  lineupId: string;
  initialPlayers: PlayerWithTournamentData[];
  fieldPlayers: PlayerWithTournamentData[];
  lineups: TournamentLineupListItem[];
  winningScorePrediction: number;
  updateLineup: (
    lineupId: string,
    playerIds: string[],
    options?: UpdateLineupOptions,
  ) => Promise<unknown>;
}

export function useLineupSlotEditor({
  lineupId,
  initialPlayers,
  fieldPlayers,
  lineups,
  winningScorePrediction,
  updateLineup,
}: UseLineupSlotEditorOptions) {
  const [slots, setSlots] = useState<Array<PlayerWithTournamentData | null>>(() =>
    padToSlots(initialPlayers),
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const initialPlayerKey = initialPlayers.map((p) => p.id).join(",");

  useEffect(() => {
    if (isSaving) return;
    setSlots(padToSlots(initialPlayers));
  }, [lineupId, initialPlayerKey, isSaving, initialPlayers]);

  const checkForDuplicateLineup = useCallback(
    (playerIds: string[], prediction: number): boolean => {
      if (playerIds.length === 0) return false;
      const normalized = [...playerIds].sort().join(",");
      return lineups.some((lineup) => {
        if (lineup.id === lineupId) return false;
        const existing = Array.isArray(lineup.players) ? lineup.players : [];
        const existingIds = existing
          .map((p) => p.id)
          .sort()
          .join(",");
        return (
          existingIds === normalized && lineup.winningScorePrediction === prediction
        );
      });
    },
    [lineupId, lineups],
  );

  const saveSlots = useCallback(
    async (newSlots: Array<PlayerWithTournamentData | null>) => {
      const playerIds = playerIdsFromSlots(newSlots);

      if (checkForDuplicateLineup(playerIds, winningScorePrediction)) {
        setSaveError(DUPLICATE_LINEUP_PREDICTION_MESSAGE);
        return false;
      }

      setIsSaving(true);
      setSaveError(null);
      try {
        await updateLineup(lineupId, playerIds, { winningScorePrediction });
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save lineup";
        setSaveError(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [checkForDuplicateLineup, lineupId, updateLineup, winningScorePrediction],
  );

  const openSlot = useCallback(
    (index: number) => {
      if (!isSaving) {
        setSelectedSlotIndex(index);
        setSaveError(null);
      }
    },
    [isSaving],
  );

  const closeSlot = useCallback(() => {
    setSelectedSlotIndex(null);
  }, []);

  const handlePlayerSelect = useCallback(
    async (playerId: string | null) => {
      if (selectedSlotIndex === null || isSaving) return;

      const newSlots = [...slots];

      if (playerId) {
        const selectedPlayer = fieldPlayers.find((p) => p.id === playerId);
        if (selectedPlayer) {
          newSlots[selectedSlotIndex] = selectedPlayer;
        }
      } else {
        newSlots.splice(selectedSlotIndex, 1);
      }

      const paddedSlots = padToSlots(
        newSlots.filter((p): p is PlayerWithTournamentData => p !== null),
      );

      setSlots(paddedSlots);
      const ok = await saveSlots(paddedSlots);
      if (ok) {
        setSelectedSlotIndex(null);
      } else {
        setSlots(padToSlots(initialPlayers));
      }
    },
    [fieldPlayers, initialPlayers, isSaving, saveSlots, selectedSlotIndex, slots],
  );

  const selectedPlayerIds = slots
    .filter((p): p is PlayerWithTournamentData => p !== null)
    .map((p) => p.id);

  const filledCount = selectedPlayerIds.length;

  return {
    slots,
    filledCount,
    selectedSlotIndex,
    selectedPlayerIds,
    isSaving,
    saveError,
    openSlot,
    closeSlot,
    handlePlayerSelect,
  };
}
