import React from "react";

export interface SideBetLineupSummaryProps {
  borderColor: string;
  userLabel: string;
  lineupNumberLabel: string | null;
  playerLine: string;
}

export const SideBetLineupSummary: React.FC<SideBetLineupSummaryProps> = ({
  borderColor,
  userLabel,
  lineupNumberLabel,
  playerLine,
}) => (
  <div
    className="rounded-sm border border-gray-300 bg-white/90 px-2.5 py-2 shadow-sm"
    style={{
      borderLeftColor: borderColor,
      borderLeftWidth: "5px",
      borderLeftStyle: "solid",
    }}
  >
    <div className="truncate text-sm font-semibold leading-tight text-gray-900">
      {userLabel}
      {lineupNumberLabel ? (
        <span className="ml-1 text-xs font-medium text-gray-500">{lineupNumberLabel}</span>
      ) : null}
    </div>
    <div className="mt-0.5 truncate text-xs text-gray-500">{playerLine}</div>
  </div>
);
