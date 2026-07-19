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

export const WinnerPoolOverview: React.FC<WinnerPoolOverviewProps> = ({
  contest,
  mode,
  placeWagerTabLocked,
}) => {
  const [isCommentaryOpen, setIsCommentaryOpen] = useState(false);

  return (
    <>
      <div className="overflow-hidden rounded-sm border border-slate-300 bg-white font-display shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-5 py-5 text-white">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-100">
              Winner Pool
            </span>
            <span className="text-xs font-semibold text-blue-200">
              {placeWagerTabLocked ? "Market closed" : "Live prediction market"}
            </span>
          </div>

          <h3 className="max-w-xl text-2xl font-bold leading-tight tracking-tight">
            Back The Winning Lineup
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100">
            Jump on the bandwagon and take down a share of the pot. Early conviction can capture
            more upside.
          </p>
        </div>

        <div className="space-y-3 p-4">
          {contest.commentary ? (
            <button
              type="button"
              className="group flex w-full items-center gap-3 rounded-sm border border-blue-200 bg-blue-50 p-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              onClick={() => setIsCommentaryOpen(true)}
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xl shadow-sm"
              >
                🤖
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-blue-950">
                  Live Contest Intelligence
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-blue-800">
                  Cutbot breaks down the contest to give you the edge.
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to="/faq#winner-pool"
              className="text-xs font-semibold text-gray-500 hover:underline"
            >
              How the Winner Pool works →
            </Link>
            {mode === "claim" ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                Winnings ready to claim
              </span>
            ) : null}
          </div>
        </div>
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
