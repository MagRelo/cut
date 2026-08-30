import { useCallback, useEffect, useRef, useState } from "react";
import type { Candidate } from "@cut/sport-sdk";
import type { PlatformLineupListItem } from "../types/lineup";
import { DUPLICATE_LINEUP_PREDICTION_MESSAGE } from "../utils/lineupPrediction";
import {
  buildCandidatesByEventParticipantId,
  platformLineupEventParticipantIds,
  platformLineupPrediction,
} from "../lib/lineupUtils";
import { lineupsInSameContestScope } from "../lib/lineupContestScope";

const SAVED_FLASH_MS = 450;
const PICKER_LEAVE_MS = 200;

type SaveStatus = "idle" | "saving" | "saved";

function padToSlots(
  candidates: Candidate[],
  slotCount: number,
): Array<Candidate | null> {
  const slots: Array<Candidate | null> = [...candidates];
  while (slots.length < slotCount) {
    slots.push(null);
  }
  return slots.slice(0, slotCount);
}

function eventParticipantIdsFromSlots(slots: Array<Candidate | null>): string[] {
  return slots
    .filter((candidate): candidate is Candidate => candidate !== null)
    .map((candidate) => candidate.eventParticipantId);
}

function idsFromCandidateKey(key: string): string[] {
  return key === "" ? [] : key.split(",");
}

function hydrateSlotsFromIds(
  ids: string[],
  fieldCandidates: Candidate[],
  fallbackCandidates: Candidate[],
  slotCount: number,
): Array<Candidate | null> {
  const fieldById = buildCandidatesByEventParticipantId(fieldCandidates);
  const fallbackById = buildCandidatesByEventParticipantId(fallbackCandidates);
  const filled = ids
    .map((id) => fieldById.get(id) ?? fallbackById.get(id) ?? null)
    .filter((candidate): candidate is Candidate => candidate !== null);
  return padToSlots(filled, slotCount);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

interface UpdateLineupOptions {
  predictionValue?: number;
}

interface UseLineupSlotEditorOptions {
  lineupId: string;
  contestId?: string | null;
  slotCount: number;
  initialCandidates: Candidate[];
  fieldCandidates: Candidate[];
  lineups: PlatformLineupListItem[];
  predictionValue: number;
  updateLineup: (
    lineupId: string,
    picks: string[],
    options?: UpdateLineupOptions,
  ) => Promise<unknown>;
}

export function useLineupSlotEditor({
  lineupId,
  contestId,
  slotCount,
  initialCandidates,
  fieldCandidates,
  lineups,
  predictionValue,
  updateLineup,
}: UseLineupSlotEditorOptions) {
  const [slots, setSlots] = useState<Array<Candidate | null>>(() =>
    hydrateSlotsFromIds(
      initialCandidates.map((candidate) => candidate.eventParticipantId),
      fieldCandidates,
      initialCandidates,
      slotCount,
    ),
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingEventParticipantId, setSavingEventParticipantId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const fieldCandidatesRef = useRef(fieldCandidates);
  const initialCandidatesRef = useRef(initialCandidates);
  fieldCandidatesRef.current = fieldCandidates;
  initialCandidatesRef.current = initialCandidates;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const initialCandidateKey = initialCandidates.map((c) => c.eventParticipantId).join(",");

  useEffect(() => {
    if (saveStatus !== "idle") return;
    setSlots((prev) => {
      const prevKey = eventParticipantIdsFromSlots(prev).join(",");
      if (prevKey === initialCandidateKey) return prev;
      return hydrateSlotsFromIds(
        idsFromCandidateKey(initialCandidateKey),
        fieldCandidatesRef.current,
        initialCandidatesRef.current,
        slotCount,
      );
    });
  }, [lineupId, initialCandidateKey, saveStatus, slotCount]);

  useEffect(() => {
    if (saveStatus !== "idle") return;
    if (fieldCandidates.length === 0) return;
    const byId = buildCandidatesByEventParticipantId(fieldCandidates);
    setSlots((prev) => {
      let changed = false;
      const next = prev.map((slot) => {
        if (!slot) return slot;
        const fresh = byId.get(slot.eventParticipantId);
        if (fresh && fresh !== slot) {
          changed = true;
          return fresh;
        }
        return slot;
      });
      return changed ? next : prev;
    });
  }, [fieldCandidates, saveStatus]);

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

      if (checkForDuplicateLineup(eventParticipantIds, predictionValue)) {
        setSaveError(DUPLICATE_LINEUP_PREDICTION_MESSAGE);
        return false;
      }

      setSaveStatus("saving");
      setSaveError(null);
      try {
        await updateLineup(lineupId, eventParticipantIds, { predictionValue });
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save lineup";
        setSaveError(message);
        setSaveStatus("idle");
        return false;
      }
    },
    [checkForDuplicateLineup, lineupId, updateLineup, predictionValue],
  );

  const openSlot = useCallback((index: number) => {
    if (saveStatus !== "idle") return;
    setSelectedSlotIndex(index);
    setSaveError(null);
  }, [saveStatus]);

  const closeSlot = useCallback(() => {
    if (saveStatus !== "idle") return;
    setSelectedSlotIndex(null);
  }, [saveStatus]);

  const handlePlayerSelect = useCallback(
    async (eventParticipantId: string | null) => {
      if (selectedSlotIndex === null || saveStatus !== "idle") return;

      setSavingEventParticipantId(eventParticipantId);

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
        slotCount,
      );

      setSlots(paddedSlots);
      const ok = await saveSlots(paddedSlots);
      if (!ok) {
        setSavingEventParticipantId(null);
        setSlots(
          hydrateSlotsFromIds(
            initialCandidates.map((candidate) => candidate.eventParticipantId),
            fieldCandidates,
            initialCandidates,
            slotCount,
          ),
        );
        return;
      }

      setSaveStatus("saved");
      await delay(SAVED_FLASH_MS);
      if (!mountedRef.current) return;
      setSelectedSlotIndex(null);
      await delay(PICKER_LEAVE_MS);
      if (!mountedRef.current) return;
      setSaveStatus("idle");
      setSavingEventParticipantId(null);
    },
    [
      fieldCandidates,
      initialCandidates,
      saveSlots,
      saveStatus,
      selectedSlotIndex,
      slotCount,
      slots,
    ],
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
    isSaving: saveStatus === "saving",
    isSaved: saveStatus === "saved",
    saveError,
    savingEventParticipantId,
    openSlot,
    closeSlot,
    handlePlayerSelect,
  };
}