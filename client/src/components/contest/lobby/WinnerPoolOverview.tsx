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
  const isLocked = mode === "locked";
  const [isCommentaryOpen, setIsCommentaryOpen] = useState(false);

  return (
    <>
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
              <Link
                to="/faq#winner-pool"
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                How it works →
              </Link>
            </>
          )}
        </div>

        {/* Commentary modal button, if available */}
        {contest.commentary ? (
          <button
            type="button"
            className="group flex w-full items-center gap-3 rounded-sm border border-blue-200 bg-blue-50 p-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={() => setIsCommentaryOpen(true)}
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xl shadow-sm"
            >
              🤖
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-blue-950">Contest Breakdown</span>
              <span className="block text-xs leading-relaxed text-blue-800">
                See each lineup's path to victory.
              </span>
            </span>
            <span
              aria-hidden="true"
              className="text-lg text-blue-600 transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </button>
        ) : null}
      </div>

      {/* Commentary modal, if available */}
      {contest.commentary ? (
        <ContestCommentaryModal
          isOpen={isCommentaryOpen}
          onClose={() => setIsCommentaryOpen(false)}
          commentary={contest.commentary}
          generatedAt={contest.commentaryGeneratedAt}
        />
      ) : null}
    </>
  );
};
