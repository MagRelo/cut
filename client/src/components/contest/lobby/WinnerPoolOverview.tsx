import React from "react";
import { Link } from "react-router-dom";
import { type Contest } from "../../../types/contest";
import { type PredictionsPanelMode } from "../../../types/contestLobby";

export interface WinnerPoolOverviewProps {
  contest: Contest;
  mode: PredictionsPanelMode;
  placeWagerTabLocked: boolean;
}

export const WinnerPoolOverview: React.FC<WinnerPoolOverviewProps> = ({ mode }) => {
  const isLocked = mode === "locked";

  return (
    <div className="space-y-3 overflow-hidden rounded-sm border border-slate-200 bg-slate-50 p-3 font-display">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Winner Pool</h2>
        {isLocked ? (
          <p className="text-sm leading-relaxed text-slate-600">
            Betting is closed. Existing wagers are locked until the contest settles.{" "}
            <Link
              to="/faq#winner-pool"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              How it works →
            </Link>
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-600">
              Back the winning lineup to win a share of the pool.{" "}
            </p>
            <Link to="/faq#winner-pool" className="text-sm font-medium text-blue-500">
              How it works →
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
