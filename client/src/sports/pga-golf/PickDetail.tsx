import React from "react";
import type { LineupPickShell } from "@cut/sport-sdk/ui";
import { parseGolfPickMetadata } from "./utils";

interface GolfPickDetailProps {
  pick: LineupPickShell;
}

export const GolfPickDetail: React.FC<GolfPickDetailProps> = ({ pick }) => {
  const meta = parseGolfPickMetadata(pick);
  const participant = meta.participant ?? {};
  const displayName =
    [participant.firstName, participant.lastName].filter(Boolean).join(" ") || "Player";
  const points =
    typeof meta.total === "number"
      ? meta.total
      : typeof meta.scoreData?.stableford === "number"
        ? meta.scoreData.stableford
        : 0;
  const position = meta.scoreData?.leaderboardPosition?.trim();

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="font-display text-sm font-semibold text-gray-900">{displayName}</div>
        <div className="text-xs text-gray-500">
          Slot {(pick.slotIndex ?? 0) + 1}
          {participant.country ? ` · ${participant.country}` : ""}
        </div>
      </div>
      <div className="text-right font-display tabular-nums">
        {position ? <div className="text-xs text-gray-500">{position}</div> : null}
        <div className="text-lg font-bold text-gray-900">{points}</div>
      </div>
    </div>
  );
};
