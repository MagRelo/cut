import React, { useState } from "react";
import { Link } from "react-router-dom";
import { type Contest } from "../../../types/contest";
import { type PredictionsPanelMode } from "../../../types/contestLobby";
import { ContestCommentaryModal } from "./ContestCommentaryModal";

export interface WinnerPoolOverviewProps {
  contest: Contest;
  mode: PredictionsPanelMode;
  placeWagerTabLocked: boolean;
}

export const WinnerPoolOverview: React.FC<WinnerPoolOverviewProps> = ({ contest, mode }) => {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const isLocked = mode === "locked";
  const hasCommentary = Boolean(contest.commentary);

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
        {hasCommentary ? (
          <div className="">
            <button
              type="button"
              className={
                isLocked
                  ? "text-sm font-medium text-blue-700 hover:underline"
                  : "text-sm font-medium text-blue-500"
              }
              onClick={() => setIsBreakdownOpen(true)}
            >
              See what cutbot thinks →
            </button>
          </div>
        ) : null}
      </div>
      {contest.commentary ? (
        <ContestCommentaryModal
          isOpen={isBreakdownOpen}
          onClose={() => setIsBreakdownOpen(false)}
          commentary={contest.commentary}
          generatedAt={contest.commentaryGeneratedAt}
        />
      ) : null}
    </div>
  );
};
