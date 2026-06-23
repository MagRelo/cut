import { useCallback, useEffect, useState } from "react";
import type { Candidate } from "@cut/sport-sdk";
import type { PlatformLineupListItem } from "../types/lineup";
import { DUPLICATE_LINEUP_PREDICTION_MESSAGE } from "../utils/winningScorePrediction";
import {
  platformLineupEventParticipantIds,
  platformLineupPrediction,
} from "../lib/lineupUtils";
import { lineupsInSameContestScope } from "../lib/lineupContestScope";

const SLOT_COUNT = 4;

function padToSlots(candidates: Candidate[]): Array<Candidate | null> {
  const slots: Array<Candidate | null> = [...candidates];
  while (slots.length < SLOT_COUNT) {
    slots.push(null);
  }
  return slots.slice(0, SLOT_COUNT);
}

function eventParticipantIdsFromSlots(slots: Array<Candidate | null>): string[] {
  return slots
    .filter((candidate): candidate is Candidate => candidate !== null)
    .map((candidate) => candidate.eventParticipantId);
}

interface UpdateLineupOptions {
  winningScorePrediction?: number;
}

interface UseLineupSlotEditorOptions {
  lineupId: string;
  contestId?: string | null;
  initialCandidates: Candidate[];
  fieldCandidates: Candidate[];
  lineups: PlatformLineupListItem[];
  winningScorePrediction: number;
  updateLineup: (
    lineupId: string,
    picks: string[],
    options?: UpdateLineupOptions,
  ) => Promise<unknown>;
}

export function useLineupSlotEditor({
  lineupId,
  contestId,
  initialCandidates,
  fieldCandidates,
  lineups,
  winningScorePrediction,
  updateLineup,
}: UseLineupSlotEditorOptions) {
  const [slots, setSlots] = useState<Array<Candidate | null>>(() =>
    padToSlots(initialCandidates),
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const initialCandidateKey = initialCandidates.map((c) => c.eventParticipantId).join(",");

  useEffect(() => {
    if (isSaving) return;
    setSlots(padToSlots(initialCandidates));
  }, [lineupId, initialCandidateKey, isSaving, initialCandidates]);

  const checkForDuplicateLineup = useCallback(
    (eventParticipantIds: string[], prediction: number): boolean => {
      if (eventParticipantIds.length === 0) return false;
      const normalized = [...eventParticipantIds].sort().join(",");
      const scopedLineups = lineupsInSameContestScope(lineups, contestId, lineupId);
      return scopedLineups.some((lineup) => {
        const existingIds = platformLineupEventParticipantIds(lineup).sort().join(",");
        return existingIds === normalized && platformLineupPrediction(lineup) === prediction;
      });
    },
    [lineupId, lineups, contestId],
  );

  const saveSlots = useCallback(
    async (newSlots: Array<Candidate | null>) => {
      const eventParticipantIds = eventParticipantIdsFromSlots(newSlots);

      if (checkForDuplicateLineup(eventParticipantIds, winningScorePrediction)) {
        setSaveError(DUPLICATE_LINEUP_PREDICTION_MESSAGE);
        return false;
      }

      setIsSaving(true);
      setSaveError(null);
      try {
        await updateLineup(lineupId, eventParticipantIds, { winningScorePrediction });
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
    async (eventParticipantId: string | null) => {
      if (selectedSlotIndex === null || isSaving) return;

      const newSlots = [...slots];

      if (eventParticipantId) {
        const selectedCandidate = fieldCandidates.find(
          (candidate) => candidate.eventParticipantId === eventParticipantId,
        );
        if (selectedCandidate) {
          newSlots[selectedSlotIndex] = selectedCandidate;
        }
      } else {
        newSlots.splice(selectedSlotIndex, 1);
      }

      const paddedSlots = padToSlots(
        newSlots.filter((candidate): candidate is Candidate => candidate !== null),
      );

      setSlots(paddedSlots);
      const ok = await saveSlots(paddedSlots);
      if (ok) {
        setSelectedSlotIndex(null);
      } else {
        setSlots(padToSlots(initialCandidates));
      }
    },
    [fieldCandidates, initialCandidates, isSaving, saveSlots, selectedSlotIndex, slots],
  );

  const selectedEventParticipantIds = slots
    .filter((candidate): candidate is Candidate => candidate !== null)
    .map((candidate) => candidate.eventParticipantId);

  const filledCount = selectedEventParticipantIds.length;

  return {
    slots,
    filledCount,
    selectedSlotIndex,
    selectedEventParticipantIds,
    isSaving,
    saveError,
    openSlot,
    closeSlot,
    handlePlayerSelect,
  };
};
