import React from "react";
import type { ParticipantRowProps } from "@cut/sport-sdk/ui";
import { F1DriverAvatar } from "./F1DriverAvatar";
import {
  candidatePoints,
  formatDriverFullName,
  formatDriverStatus,
  formatOrdinal,
  formatTeamColor,
  parseF1CandidateMetadata,
} from "./utils";

export const F1ParticipantRow: React.FC<ParticipantRowProps> = ({
  candidate,
  status,
  onClick,
  ownershipPercentage,
}) => {
  const meta = parseF1CandidateMetadata(candidate);
  const participant = meta.participant ?? {};
  const scoreData = meta.scoreData ?? {};
  const teamColor = formatTeamColor(participant.teamColour);
  const showLiveLayout = status === "LIVE" || status === "COMPLETE";
  const totalPoints = candidatePoints(candidate);
  const positionDisplay =
    scoreData.position != null ? `P${scoreData.position}` : showLiveLayout ? "—" : "";
  const statusLabel = formatDriverStatus(scoreData.status);
  const teamName = participant.teamName?.trim() || "—";
  const driverName = formatDriverFullName(candidate);

  const driverAvatar = (
    <F1DriverAvatar
      displayName={driverName}
      headshotUrl={participant.headshotUrl}
      teamColor={teamColor}
    />
  );

  const inactiveContent = (
    <div className="flex min-w-0 items-center gap-3">
      {driverAvatar}
      <div className="min-w-0 flex-1">
        <div className="truncate text-md font-semibold leading-tight text-gray-900">
          {driverName}
        </div>
        <div className="truncate text-xs text-gray-600">
          {teamName}
          {participant.gridPosition != null
            ? ` · Grid ${formatOrdinal(participant.gridPosition)}`
            : ""}
        </div>
      </div>
    </div>
  );

  const liveContent = (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex w-8 shrink-0 flex-col items-center justify-center text-center tabular-nums">
        <span className="text-xs font-semibold leading-none text-gray-800">{positionDisplay}</span>
      </div>

      {driverAvatar}

      <div className="min-w-0 flex-1">
        <div className="truncate text-md font-semibold leading-tight text-gray-900">
          {driverName}
        </div>
        <div className="flex min-h-5 items-center gap-2 text-xs text-gray-600">
          <span className="truncate">{teamName}</span>
          <span className="shrink-0 text-gray-400">·</span>
          <span className="shrink-0">{statusLabel}</span>
          {scoreData.provisional ? (
            <span className="shrink-0 font-medium text-amber-600">Provisional</span>
          ) : null}
        </div>
      </div>

      {ownershipPercentage !== undefined ? (
        <div className="min-w-[3.25rem] shrink-0 rounded bg-slate-100 px-2 py-1 text-center">
          <div className="text-xs font-semibold leading-none text-slate-700">
            {ownershipPercentage}%
          </div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-slate-500">
            OWN
          </div>
        </div>
      ) : null}

      <div className="shrink-0 text-center">
        <div className="text-lg font-bold leading-none text-gray-900">{totalPoints}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
          PTS
        </div>
      </div>
    </div>
  );

  const content = showLiveLayout ? liveContent : inactiveContent;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group w-full min-w-0 cursor-pointer text-left font-display"
      >
        {content}
      </button>
    );
  }

  return <div className="w-full min-w-0 font-display">{content}</div>;
};
