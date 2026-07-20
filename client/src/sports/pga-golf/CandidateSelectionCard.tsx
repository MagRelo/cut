import React from "react";
import type { Candidate } from "@cut/sport-sdk";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { ParticipantStatsPanel } from "./ParticipantStatsPanel";
import { formatOrdinalRank, getParticipantSeasonStats } from "./participantStats";
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
  const { owgr } = getParticipantSeasonStats(candidate);
  const shell =
    "overflow-hidden rounded-md border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm p-3";

  const imageUrl = typeof participant.imageUrl === "string" ? participant.imageUrl : null;
  const country = typeof participant.country === "string" ? participant.country : "—";
  const showOwgrBadge = owgr !== "—";

  return (
    <div className={`${shell} ${className}`}>
      <div className="flex items-center gap-3 pt-1">
        <ParticipantAvatar imageUrl={imageUrl} alt={candidate.displayName || "Unknown"} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-left text-xl font-semibold leading-tight text-slate-900">
            {candidate.displayName || "Unknown"}
          </h3>
          <p className="mt-0.5 truncate text-left text-sm leading-tight text-slate-600">
            {country}
          </p>
        </div>
        {showOwgrBadge ? (
          <div className="flex h-14 min-w-14 shrink-0 items-center justify-center">
            <span className="inline-flex flex-col items-center justify-center rounded-md border border-slate-300 bg-gradient-to-b from-slate-100 to-slate-50 p-3 pb-1.5 pt-2 leading-snug">
              <span className="whitespace-nowrap text-sm font-bold tabular-nums leading-tight text-slate-800">
                {formatOrdinalRank(owgr)}
              </span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                Rank
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <ParticipantStatsPanel candidate={candidate} className="mt-5" />
    </div>
  );
};
