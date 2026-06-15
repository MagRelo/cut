import { useCallback, useEffect, useState } from "react";
import type { Candidate } from "@cut/sport-sdk";
import type { PlatformLineupListItem } from "../types/lineup";
import { DUPLICATE_LINEUP_PREDICTION_MESSAGE } from "../utils/winningScorePrediction";
import {
  platformLineupParticipantIds,
  platformLineupPrediction,
} from "../lib/lineupUtils";

const SLOT_COUNT = 4;

function padToSlots(candidates: Candidate[]): Array<Candidate | null> {
  const slots: Array<Candidate | null> = [...candidates];
  while (slots.length < SLOT_COUNT) {
    slots.push(null);
  }
  return slots.slice(0, SLOT_COUNT);
}

function participantIdsFromSlots(slots: Array<Candidate | null>): string[] {
  return slots
    .filter((candidate): candidate is Candidate => candidate !== null)
    .map((candidate) => candidate.participantId);
}

interface UpdateLineupOptions {
  winningScorePrediction?: number;
}

interface UseLineupSlotEditorOptions {
  lineupId: string;
  initialCandidates: Candidate[];
  fieldCandidates: Candidate[];
  lineups: PlatformLineupListItem[];
  winningScorePrediction: number;
  updateLineup: (
    lineupId: string,
    playerIds: string[],
    options?: UpdateLineupOptions,
  ) => Promise<unknown>;
}

export function useLineupSlotEditor({
  lineupId,
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

  const initialCandidateKey = initialCandidates.map((c) => c.participantId).join(",");

  useEffect(() => {
    if (isSaving) return;
    setSlots(padToSlots(initialCandidates));
  }, [lineupId, initialCandidateKey, isSaving, initialCandidates]);

  const checkForDuplicateLineup = useCallback(
    (participantIds: string[], prediction: number): boolean => {
      if (participantIds.length === 0) return false;
      const normalized = [...participantIds].sort().join(",");
      return lineups.some((lineup) => {
        if (lineup.id === lineupId) return false;
        const existingIds = platformLineupParticipantIds(lineup).sort().join(",");
        return existingIds === normalized && platformLineupPrediction(lineup) === prediction;
      });
    },
    [lineupId, lineups],
  );

  const saveSlots = useCallback(
    async (newSlots: Array<Candidate | null>) => {
      const participantIds = participantIdsFromSlots(newSlots);

      if (checkForDuplicateLineup(participantIds, winningScorePrediction)) {
        setSaveError(DUPLICATE_LINEUP_PREDICTION_MESSAGE);
        return false;
      }

      setIsSaving(true);
      setSaveError(null);
      try {
        await updateLineup(lineupId, participantIds, { winningScorePrediction });
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
    async (participantId: string | null) => {
      if (selectedSlotIndex === null || isSaving) return;

      const newSlots = [...slots];

      if (participantId) {
        const selectedCandidate = fieldCandidates.find(
          (candidate) => candidate.participantId === participantId,
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

  const selectedParticipantIds = slots
    .filter((candidate): candidate is Candidate => candidate !== null)
    .map((candidate) => candidate.participantId);

  const filledCount = selectedParticipantIds.length;

  return {
    slots,
    filledCount,
    selectedSlotIndex,
    selectedParticipantIds,
    isSaving,
    saveError,
    openSlot,
    closeSlot,
    handlePlayerSelect,
  };
};
