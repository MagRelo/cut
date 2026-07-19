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
  const [isCommentaryOpen, setIsCommentaryOpen] = useState(false);

  return (
    <>
      <div className="overflow-hidden font-display">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {mode === "claim" ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              Winnings ready to claim
            </span>
          ) : null}
        </div>

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
        ) : (
          <div className="flex items-center gap-3 rounded-sm border border-slate-200 bg-slate-50 p-3">
            <span aria-hidden="true" className="text-xl">
              🤖
            </span>
            <p className="text-xs leading-relaxed text-slate-600">
              Cutbot is watching the field. Live contest analysis will appear here.
            </p>
          </div>
        )}

        {/* <Link
          to="/faq#winner-pool"
          className="mt-3 block text-xs font-semibold text-gray-500 hover:underline"
        >
          How the Winner Pool works →
        </Link> */}
      </div>

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
