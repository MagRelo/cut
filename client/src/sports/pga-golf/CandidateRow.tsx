import React from "react";
import type { CandidateRowProps } from "@cut/sport-sdk/ui";
import type { EventStatus } from "@cut/sport-sdk";
import { useOptionalEventScope } from "../../contexts/EventScopeContext";
import { CandidateSelectedOverlay } from "../../components/platform/CandidateSelectedOverlay";
import { CandidateSelectionCard } from "./CandidateSelectionCard";
import { GolfParticipantRow } from "./ParticipantRow";

function pickerLiveStatus(status: EventStatus): EventStatus {
  return status === "COMPLETE" ? "COMPLETE" : "LIVE";
}

function LivePickerCandidateRow({
  candidate,
  onSelect,
  isSelected = false,
  disabled = false,
  status,
  eventMetadata,
}: CandidateRowProps) {
  const resolvedStatus = pickerLiveStatus(status ?? "LIVE");

  const row = (
    <GolfParticipantRow
      candidate={candidate}
      status={resolvedStatus}
      eventMetadata={eventMetadata}
      onClick={disabled ? undefined : onSelect}
    />
  );

  return (
    <div
      className={`border-b border-gray-100 px-3 py-2.5 ${
        isSelected ? "bg-blue-50" : onSelect && !disabled ? "hover:bg-gray-50" : ""
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {row}
    </div>
  );
}

export const GolfCandidateRow: React.FC<CandidateRowProps> = (props) => {
  const { onSelect, isSelected = false, disabled = false, candidate, status, eventMetadata } =
    props;
  const scope = useOptionalEventScope();
  const resolvedStatus = status ?? scope?.status ?? "SCHEDULED";
  const resolvedMetadata = eventMetadata ?? scope?.metadata;

  if (resolvedStatus === "LIVE" || resolvedStatus === "COMPLETE") {
    return (
      <LivePickerCandidateRow
        {...props}
        status={resolvedStatus}
        eventMetadata={resolvedMetadata}
      />
    );
  }

  if (!onSelect) {
    return <CandidateSelectionCard candidate={candidate} />;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`relative w-full rounded-sm text-left transition-all ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      {isSelected ? <CandidateSelectedOverlay /> : null}
      <CandidateSelectionCard candidate={candidate} />
    </button>
  );
};
