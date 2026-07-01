import React from "react";
import type { CandidateRowProps } from "@cut/sport-sdk/ui";
import type { EventStatus } from "@cut/sport-sdk";
import { useOptionalEventScope } from "../../contexts/EventScopeContext";
import { CandidateSelectedOverlay } from "../../components/platform/CandidateSelectedOverlay";
import { CommodityCandidateSelectionCard } from "./CandidateSelectionCard";
import { CommodityParticipantRow } from "./ParticipantRow";

function pickerLiveStatus(status: EventStatus): EventStatus {
  return status === "COMPLETE" ? "COMPLETE" : "LIVE";
}

export const CommodityCandidateRow: React.FC<CandidateRowProps> = (props) => {
  const { onSelect, isSelected = false, disabled = false, candidate, status } = props;
  const scope = useOptionalEventScope();
  const resolvedStatus = status ?? scope?.status ?? "SCHEDULED";

  if (resolvedStatus === "LIVE" || resolvedStatus === "COMPLETE") {
    return (
      <div
        className={`border-b border-gray-100 px-3 py-2.5 ${
          isSelected ? "bg-blue-50" : onSelect && !disabled ? "hover:bg-gray-50" : ""
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <CommodityParticipantRow
          candidate={candidate}
          status={pickerLiveStatus(resolvedStatus)}
          onClick={disabled ? undefined : onSelect}
        />
      </div>
    );
  }

  if (!onSelect) {
    return <CommodityCandidateSelectionCard candidate={candidate} />;
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
      <CommodityCandidateSelectionCard candidate={candidate} />
    </button>
  );
};
