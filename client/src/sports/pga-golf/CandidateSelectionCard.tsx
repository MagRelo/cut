import React from "react";
import type { Candidate } from "@cut/sport-sdk";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { ParticipantStatsPanel } from "./ParticipantStatsPanel";
import { parseGolfCandidateMetadata } from "./utils";

interface CandidateSelectionCardProps {
  candidate: Candidate;
  className?: string;
}

export const CandidateSelectionCard: React.FC<CandidateSelectionCardProps> = ({
  candidate,
  className = "",
}) => {
  const meta = parseGolfCandidateMetadata(candidate);
  const participant = (meta.participant ?? {}) as Record<string, unknown>;
  const shell =
    "overflow-hidden rounded-md border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm";

  const imageUrl = typeof participant.imageUrl === "string" ? participant.imageUrl : null;
  const country = typeof participant.country === "string" ? participant.country : "—";

  return (
    <div className={`${shell} p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <ParticipantAvatar
          imageUrl={imageUrl}
          alt={candidate.displayName || "Unknown"}
          size="md"
        />
        <div className="min-w-0 flex-1 mt-1">
          <h3 className="truncate text-left text-xl font-semibold leading-tight text-slate-900">
            {candidate.displayName || "Unknown"}
          </h3>
          <p className="truncate text-left text-sm text-slate-600">{country}</p>
        </div>
      </div>

      <ParticipantStatsPanel candidate={candidate} className="mt-3" />
    </div>
  );
};
