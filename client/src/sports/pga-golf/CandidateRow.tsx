import React from "react";
import type { Candidate } from "@cut/sport-sdk";
import { useActiveEvent } from "../../hooks/useActiveEvent";
import { candidateStableford, parseGolfCandidateMetadata } from "./utils";
import { CandidateSelectionCard } from "./CandidateSelectionCard";

interface GolfCandidateRowProps {
  candidate: Candidate;
  onSelect?: () => void;
  isSelected?: boolean;
  disabled?: boolean;
}

function LiveCandidateRow({
  candidate,
  onSelect,
  isSelected,
  disabled,
}: GolfCandidateRowProps) {
  const meta = parseGolfCandidateMetadata(candidate);
  const participant = meta.participant ?? {};
  const owgr = participant.owgr ?? candidate.sortKeys.owgr;
  const position = meta.scoreData?.leaderboardPosition?.trim();
  const total = meta.scoreData?.leaderboardTotal?.trim();
  const points = candidateStableford(candidate);

  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {participant.imageUrl ? (
          <img
            src={participant.imageUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full bg-gray-100 object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
            {(participant.lastName ?? candidate.displayName).slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-semibold text-gray-900">
            {candidate.displayName}
          </div>
          <div className="truncate text-xs text-gray-500">
            {participant.countryFlag ? `${participant.countryFlag} ` : ""}
            {participant.country ?? ""}
            {owgr != null && owgr !== "" ? ` · OWGR ${owgr}` : ""}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-right font-display tabular-nums">
        {position ? (
          <span className="w-8 text-sm font-semibold text-gray-700">{position}</span>
        ) : null}
        {total ? <span className="w-10 text-sm text-gray-600">{total}</span> : null}
        <span className="w-10 text-lg font-bold text-gray-900">{points}</span>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2.5 text-left transition-colors ${
          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2.5">
      {content}
    </div>
  );
}

export const GolfCandidateRow: React.FC<GolfCandidateRowProps> = (props) => {
  const { onSelect, isSelected = false, disabled = false } = props;
  const { status } = useActiveEvent();

  if (status === "LIVE" || status === "COMPLETE") {
    return <LiveCandidateRow {...props} />;
  }

  if (!onSelect) {
    return <CandidateSelectionCard candidate={props.candidate} />;
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
      {isSelected ? (
        <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-sm bg-green-600 px-2 py-1">
          <svg
            className="h-4 w-4 shrink-0 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      ) : null}
      <CandidateSelectionCard candidate={props.candidate} />
    </button>
  );
};
