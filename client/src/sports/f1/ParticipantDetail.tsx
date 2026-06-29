import React from "react";
import type { ParticipantDetailProps } from "@cut/sport-sdk/ui";
import { F1ParticipantRow } from "./ParticipantRow";
import {
  candidatePoints,
  formatDriverStatus,
  formatOrdinal,
  parseF1CandidateMetadata,
} from "./utils";

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

export const F1ParticipantDetail: React.FC<ParticipantDetailProps> = ({
  candidate,
  status,
  rowTrailing = "share",
  onShare,
}) => {
  const meta = parseF1CandidateMetadata(candidate);
  const scoreData = meta.scoreData ?? {};
  const participant = meta.participant ?? {};
  const totalPoints = candidatePoints(candidate);

  return (
    <div className="overflow-hidden rounded-sm border border-gray-300 bg-white">
      <div className="p-3 py-4">
        <F1ParticipantRow candidate={candidate} status={status} />
      </div>

      <div
        className="grid w-full grid-cols-4 items-stretch divide-x divide-gray-200 border-t border-gray-200 bg-white"
        role="presentation"
      >
        <StatCell
          label="Grid"
          value={formatOrdinal(participant.gridPosition)}
        />
        <StatCell
          label="Finish"
          value={scoreData.position != null ? `P${scoreData.position}` : "—"}
        />
        <StatCell
          label="Race"
          value={String(scoreData.finishPoints ?? 0)}
        />
        <StatCell
          label="Bonus"
          value={String(scoreData.bonusPoints ?? 0)}
        />
      </div>

      <div className="border-t border-gray-200 bg-slate-50 px-4 py-3 text-sm text-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Status: <strong>{formatDriverStatus(scoreData.status)}</strong>
          </span>
          <span>
            Total: <strong>{totalPoints} pts</strong>
            {scoreData.provisional ? " (provisional)" : ""}
          </span>
          {scoreData.lapsCompleted != null ? (
            <span>
              Laps: <strong>{scoreData.lapsCompleted}</strong>
            </span>
          ) : null}
        </div>
        {rowTrailing === "share" && onShare ? (
          <button
            type="button"
            onClick={onShare}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Share driver link
          </button>
        ) : null}
      </div>
    </div>
  );
};
