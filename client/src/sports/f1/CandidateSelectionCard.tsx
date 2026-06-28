import React from "react";
import { UserIcon } from "@heroicons/react/24/outline";
import type { Candidate } from "@cut/sport-sdk";
import { formatOrdinal, formatTeamColor, parseF1CandidateMetadata } from "./utils";

interface CandidateSelectionCardProps {
  candidate: Candidate;
  className?: string;
}

export const F1CandidateSelectionCard: React.FC<CandidateSelectionCardProps> = ({
  candidate,
  className = "",
}) => {
  const meta = parseF1CandidateMetadata(candidate);
  const participant = meta.participant ?? {};
  const teamColor = formatTeamColor(participant.teamColour);
  const grid = formatOrdinal(participant.gridPosition);
  const championship = formatOrdinal(participant.championshipPosition);
  const teamName = participant.teamName?.trim() || "—";

  return (
    <div
      className={`overflow-hidden rounded-md border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm ${className}`}
    >
      {teamColor ? (
        <div className="h-1.5 w-full" style={{ backgroundColor: teamColor }} aria-hidden />
      ) : null}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {participant.headshotUrl ? (
            <img
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white"
              src={participant.headshotUrl}
              alt={candidate.displayName}
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <UserIcon className="h-8 w-8 text-slate-300" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1 mt-1">
            <h3 className="truncate text-left text-xl font-semibold leading-tight text-slate-900">
              {candidate.displayName || "Unknown"}
            </h3>
            <p className="truncate text-left text-sm text-slate-600">{teamName}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <div className="rounded-sm border border-blue-100 bg-gradient-to-b from-blue-50/95 to-blue-50/45 px-2 py-1.5 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-800">
              Grid
            </div>
            <div className="mt-1 text-[13px] font-bold tabular-nums text-slate-800">{grid}</div>
          </div>
          <div className="rounded-sm border border-blue-100 bg-gradient-to-b from-blue-50/95 to-blue-50/45 px-2 py-1.5 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-800">
              Championship
            </div>
            <div className="mt-1 text-[13px] font-bold tabular-nums text-slate-800">
              {championship}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
