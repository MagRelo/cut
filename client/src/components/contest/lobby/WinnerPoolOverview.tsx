import React from "react";
import { Link } from "react-router-dom";
import { type Contest, type ContestStatus } from "../../../types/contest";
import { type PredictionsPanelMode } from "../../../types/contestLobby";

function statusBadgeClass(status: ContestStatus): string {
  switch (status) {
    case "OPEN":
    case "ACTIVE":
      return "border border-emerald-200 bg-emerald-100 text-emerald-800";
    case "LOCKED":
      return "border border-amber-200 bg-amber-100 text-amber-800";
    default:
      return "border border-gray-200 bg-gray-100 text-gray-700";
  }
}

function winnerPoolStatusLabel(status: ContestStatus): string {
  switch (status) {
    case "OPEN":
      return "Live";
    case "ACTIVE":
      return "Live";
    case "LOCKED":
      return "Locked";
    default:
      return status;
  }
}

export interface WinnerPoolOverviewProps {
  contest: Contest;
  mode: PredictionsPanelMode;
  placeWagerTabLocked: boolean;
}

export const WinnerPoolOverview: React.FC<WinnerPoolOverviewProps> = ({ contest, mode }) => {
  return (
    <div className="rounded-sm border border-gray-200 bg-gray-50 p-4 font-display">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900">Winner Pool</h3>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(contest.status)}`}
        >
          {winnerPoolStatusLabel(contest.status)}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-gray-600">
        A live market on which lineup wins the contest—odds move as wagers come in. Spot a rising
        lineup and bet to win your share of the pot.{" "}
        <Link
          to="/faq#winner-pool"
          className="font-medium text-gray-700 underline-offset-2 hover:text-gray-900 hover:underline"
        >
          Learn more...
        </Link>
      </p>

      {mode === "claim" ? (
        <p className="mt-2 text-sm font-medium text-emerald-700">You have winnings to claim.</p>
      ) : null}
    </div>
  );
};
