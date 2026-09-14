import React, { useCallback, useEffect, useRef, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { Candidate } from "@cut/sport-sdk";
import type { EventStatus } from "../../types/event";
import { CandidatePicker } from "../platform/CandidatePicker";
import { SportLineupPickRow } from "../platform/SportLineupPickRow";
import { SportParticipantDetailModal } from "../platform/SportParticipantDetailModal";
import { useEventCandidatesQuery } from "../../hooks/useSportData";
import { useSportRosterRules } from "../../hooks/useSportRosterRules";
import {
  PICKER_LEAVE_MS,
  PICKER_LOCAL_SAVE_MS,
  PICKER_SAVED_FLASH_MS,
} from "../../lib/candidatePickerTiming";
import { LineupPlayerSlotLoading } from "./LineupPlayerSlotLoading";
import { LineupEmptySlotLabel, LineupSlotShell } from "./LineupSlotShell";

const DEFAULT_USER_COLOR = "#9CA3AF";

type SaveStatus = "idle" | "saving" | "saved";

function padToSlots(candidates: Candidate[], slotCount: number): Array<Candidate | null> {
  const slots: Array<Candidate | null> = [...candidates];
  while (slots.length < slotCount) {
    slots.push(null);
  }
  return slots.slice(0, slotCount);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export interface GuestLineupPickerProps {
  sportId: string;
  eventId: string;
  eventStatus: EventStatus;
  eventMetadata?: unknown;
  /** Storybook seed — production always starts empty. */
  initialCandidates?: Candidate[];
}

export const GuestLineupPicker: React.FC<GuestLineupPickerProps> = ({
  sportId,
  eventId,
  eventStatus,
  eventMetadata,
  initialCandidates = [],
}) => {
  const rosterRules = useSportRosterRules(sportId);
  const { data: fieldCandidates = [], isLoading: isCandidatesLoading } = useEventCandidatesQuery(
    sportId,
    eventId,
  );
  const [picks, setPicks] = useState<Candidate[]>(initialCandidates);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savingEventParticipantId, setSavingEventParticipantId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const slotCount = rosterRules?.slotCount ?? 0;
  const slots = padToSlots(picks, slotCount);
  const selectedEventParticipantIds = picks.map((candidate) => candidate.eventParticipantId);
  const showFieldLoading =
    !rosterRules || (isCandidatesLoading && picks.length === 0 && initialCandidates.length === 0);
  const slotPlaceholders = slotCount > 0 ? slotCount : 1;

  const openSlot = (index: number) => {
    if (saveStatus !== "idle") return;
    setSelectedSlotIndex(index);
  };

  const closeSlot = () => {
    if (saveStatus !== "idle") return;
    setSelectedSlotIndex(null);
  };

  const handlePlayerSelect = useCallback(
    async (eventParticipantId: string | null) => {
      if (selectedSlotIndex === null || saveStatus !== "idle") return;

      setSavingEventParticipantId(eventParticipantId);
      setSaveStatus("saving");

      const nextSlots = [...slots];
      if (eventParticipantId) {
        const selectedCandidate = fieldCandidates.find(
          (candidate) => candidate.eventParticipantId === eventParticipantId,
        );
        if (!selectedCandidate) {
          setSaveStatus("idle");
          setSavingEventParticipantId(null);
          return;
        }
        nextSlots[selectedSlotIndex] = selectedCandidate;
      } else {
        nextSlots.splice(selectedSlotIndex, 1);
      }

      setPicks(nextSlots.filter((candidate): candidate is Candidate => candidate !== null));

      await delay(PICKER_LOCAL_SAVE_MS);
      if (!mountedRef.current) return;
      setSaveStatus("saved");
      await delay(PICKER_SAVED_FLASH_MS);
      if (!mountedRef.current) return;
      setSelectedSlotIndex(null);
      await delay(PICKER_LEAVE_MS);
      if (!mountedRef.current) return;
      setSaveStatus("idle");
      setSavingEventParticipantId(null);
    },
    [fieldCandidates, saveStatus, selectedSlotIndex, slots],
  );

  if (showFieldLoading) {
    return (
      <div className="bg-white">
        <div
          className="px-3 py-4 font-display"
          style={{
            borderLeftColor: DEFAULT_USER_COLOR,
            borderLeftWidth: "5px",
            borderLeftStyle: "solid",
          }}
        >
          <div className="min-w-0 text-left font-display">
            <div className="truncate text-xl font-semibold leading-tight text-gray-900">
              Create your lineup
            </div>
            <div className="mt-1.5 h-4 w-28 rounded bg-slate-100" />
          </div>
        </div>
        <div className="px-3 pb-3 pt-0">
          <div className="mb-4 mt-3 space-y-6">
            {Array.from({ length: slotPlaceholders }, (_, index) => (
              <div key={`guest-loading-slot-${index}`} className="px-3">
                <LineupPlayerSlotLoading />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div
        className="px-3 py-4 font-display"
        style={{
          borderLeftColor: DEFAULT_USER_COLOR,
          borderLeftWidth: "5px",
          borderLeftStyle: "solid",
        }}
      >
        <div className="min-w-0 text-left font-display">
          <div className="truncate text-xl font-semibold leading-tight text-gray-900">
            Create your lineup
          </div>
          <div className="truncate text-sm leading-tight text-gray-700">
            Choose {slotCount} {slotCount === 1 ? "player" : "players"}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 pt-0">
        <div className="mb-4 mt-3 space-y-6">
          {slots.map((candidate, index) => (
            <div key={`guest-slot-${index}`} className="px-3">
              {candidate ? (
                <LineupSlotShell>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <SportLineupPickRow
                      candidate={candidate}
                      status={eventStatus}
                      eventMetadata={eventMetadata}
                      onClick={() => setDetailCandidate(candidate)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => openSlot(index)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-500 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
                    aria-label={`Edit pick in slot ${index + 1}`}
                  >
                    <svg
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    Edit
                  </button>
                </LineupSlotShell>
              ) : (
                <LineupSlotShell>
                  <button
                    type="button"
                    onClick={() => openSlot(index)}
                    className="flex min-w-0 flex-1 items-center overflow-hidden text-left font-display"
                  >
                    <LineupEmptySlotLabel />
                  </button>
                  <button
                    type="button"
                    onClick={() => openSlot(index)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-500 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
                    aria-label={`Add pick to slot ${index + 1}`}
                  >
                    <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Add
                  </button>
                </LineupSlotShell>
              )}
            </div>
          ))}
        </div>
      </div>

      <CandidatePicker
        sportId={sportId}
        eventId={eventId}
        isOpen={selectedSlotIndex !== null}
        onClose={closeSlot}
        onSelect={(eventParticipantId) => void handlePlayerSelect(eventParticipantId)}
        onClearSlot={() => void handlePlayerSelect(null)}
        selectedEventParticipantIds={selectedEventParticipantIds}
        isSaving={saveStatus === "saving"}
        isSaved={saveStatus === "saved"}
        savingEventParticipantId={savingEventParticipantId}
      />

      <SportParticipantDetailModal
        isOpen={detailCandidate !== null}
        onClose={() => setDetailCandidate(null)}
        candidate={detailCandidate}
        sportId={sportId}
        eventId={eventId}
        status={eventStatus}
        eventMetadata={eventMetadata}
      />
    </div>
  );
};
