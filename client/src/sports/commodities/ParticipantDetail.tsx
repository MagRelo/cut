import React from "react";
import type { ParticipantDetailProps } from "@cut/sport-sdk/ui";
import { CommodityParticipantRow } from "./ParticipantRow";
import {
  candidateDisplayScore,
  formatPctReturn,
  formatPrice,
  parseCommodityCandidateMetadata,
} from "./commodityUtils";
import { sectorLabel } from "./utils";

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col px-1 py-1.5 text-center">
      <div className="mb-0 w-full pb-0.5 pt-0.5 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>
      <div className="flex min-h-[1.5rem] items-center justify-center text-lg font-bold leading-none text-gray-900">
        {value}
      </div>
    </div>
  );
}

export const CommodityParticipantDetail: React.FC<ParticipantDetailProps> = ({
  candidate,
  status,
}) => {
  const meta = parseCommodityCandidateMetadata(candidate);
  const scoreData = meta.scoreData ?? {};
  const participant = meta.participant ?? {};
  const displayScore = candidateDisplayScore(candidate);

  return (
    <div className="overflow-hidden rounded-sm border border-gray-300 bg-white">
      <div className="p-3 py-4">
        <CommodityParticipantRow candidate={candidate} status={status} />
      </div>

      <div
        className="grid w-full grid-cols-3 items-stretch divide-x divide-gray-200 border-t border-gray-200 bg-white"
        role="presentation"
      >
        <StatCell label="Open" value={formatPrice(scoreData.openPrice)} />
        <StatCell label="Last" value={formatPrice(scoreData.currentPrice ?? scoreData.closePrice)} />
        <StatCell label="Move" value={formatPctReturn(scoreData.pctReturn)} />
      </div>

      <div className="border-t border-gray-200 bg-slate-50 px-4 py-3 text-sm text-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Sector: <strong>{sectorLabel(participant.sector)}</strong>
          </span>
          <span>
            Score: <strong>{displayScore.toFixed(1)}</strong>
            {scoreData.provisional ? " (provisional)" : ""}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Fantasy scoring only — not investment advice.
        </p>
      </div>
    </div>
  );
};
