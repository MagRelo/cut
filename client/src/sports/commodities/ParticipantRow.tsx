import React from "react";
import type { CandidateRowProps } from "@cut/sport-sdk/ui";
import { CommodityAvatar } from "./CommodityAvatar";
import {
  candidateDisplayScore,
  formatDisplayScore,
  formatPctReturn,
  parseCommodityCandidateMetadata,
} from "./commodityUtils";
import { sectorColor, sectorLabel } from "./utils";

export const CommodityParticipantRow: React.FC<{
  candidate: CandidateRowProps["candidate"];
  status: CandidateRowProps["status"];
  onClick?: () => void;
  ownershipPercentage?: number;
}> = ({ candidate, status, onClick, ownershipPercentage }) => {
  const meta = parseCommodityCandidateMetadata(candidate);
  const participant = meta.participant ?? {};
  const scoreData = meta.scoreData ?? {};
  const showLive = status === "LIVE" || status === "COMPLETE";
  const displayScore = candidateDisplayScore(candidate);

  const avatar = (
    <CommodityAvatar
      displayName={candidate.displayName}
      iconKey={participant.iconKey}
      sector={participant.sector}
    />
  );

  const inactive = (
    <div className="flex min-w-0 items-center gap-3">
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="truncate text-md font-semibold leading-tight text-gray-900">
          {candidate.displayName}
        </div>
        <div className="truncate text-xs text-gray-600">
          <span
            className="mr-1 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: sectorColor(participant.sector) }}
          />
          {sectorLabel(participant.sector)}
        </div>
      </div>
    </div>
  );

  const live = (
    <div className="flex min-w-0 items-center justify-between gap-3">
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="truncate text-md font-semibold leading-tight text-gray-900">
          {candidate.displayName}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>{sectorLabel(participant.sector)}</span>
          <span className="text-gray-400">·</span>
          <span className={displayScore >= 0 ? "text-emerald-600" : "text-red-600"}>
            {formatPctReturn(scoreData.pctReturn)}
          </span>
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
        <div className="text-lg font-bold leading-none text-gray-900">
          {formatDisplayScore(displayScore)}
        </div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
          PTS
        </div>
      </div>
    </div>
  );

  const content = showLive ? live : inactive;

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
