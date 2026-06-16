import React, { useCallback, useMemo } from "react";
import { useEventCandidatesQuery } from "../../hooks/useSportData";
import {
  eventParticipantIdsFromParticipantIds,
  participantIdFromEventParticipantId,
} from "../../lib/lineupApi";
import { CandidatePicker } from "./CandidatePicker";

interface LineupSlotPickerProps {
  sportId: string;
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedParticipantIds: string[];
  onSelectParticipant: (participantId: string | null) => void | Promise<void>;
  isSaving?: boolean;
  saveError?: string | null;
}

/** Bridges legacy participant IDs to sport `CandidatePicker` (eventParticipantId). */
export const LineupSlotPicker: React.FC<LineupSlotPickerProps> = ({
  sportId,
  eventId,
  isOpen,
  onClose,
  selectedParticipantIds,
  onSelectParticipant,
  isSaving = false,
  saveError = null,
}) => {
  const { data: candidates = [] } = useEventCandidatesQuery(sportId, eventId);

  const selectedEventParticipantIds = useMemo(
    () => eventParticipantIdsFromParticipantIds(candidates, selectedParticipantIds),
    [candidates, selectedParticipantIds],
  );

  const handleSelect = useCallback(
    (eventParticipantId: string) => {
      const participantId = participantIdFromEventParticipantId(candidates, eventParticipantId);
      if (participantId) {
        void onSelectParticipant(participantId);
      }
    },
    [candidates, onSelectParticipant],
  );

  return (
    <CandidatePicker
      sportId={sportId}
      eventId={eventId}
      isOpen={isOpen}
      onClose={onClose}
      selectedEventParticipantIds={selectedEventParticipantIds}
      onSelect={handleSelect}
      onClearSlot={() => void onSelectParticipant(null)}
      isSaving={isSaving}
      saveError={saveError}
    />
  );
};
