import React from "react";
import type { Candidate } from "@cut/sport-sdk";
import { CommodityAvatar } from "./CommodityAvatar";
import { parseCommodityCandidateMetadata } from "./commodityUtils";
import { sectorColor, sectorLabel } from "./utils";

export const CommodityCandidateSelectionCard: React.FC<{ candidate: Candidate }> = ({
  candidate,
}) => {
  const meta = parseCommodityCandidateMetadata(candidate);
  const participant = meta.participant ?? {};

  return (
    <div className="flex min-h-[5.5rem] flex-col justify-between rounded-sm border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <CommodityAvatar
          displayName={candidate.displayName}
          iconKey={participant.iconKey}
          sector={participant.sector}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-bold text-gray-900">
            {candidate.displayName}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: sectorColor(participant.sector) }}
            />
            {sectorLabel(participant.sector)}
          </div>
        </div>
      </div>
    </div>
  );
};
