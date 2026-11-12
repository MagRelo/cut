import React, { useState } from "react";
import { Link } from "react-router-dom";
import { type Contest } from "../../../types/contest";
import { type PredictionsPanelMode } from "../../../types/contestLobby";
import { BrandLogo } from "../../common/BrandLogo";
import { ContestCommentaryModal } from "./ContestCommentaryModal";

export interface WinnerPoolOverviewProps {
  contest: Contest;
  mode: PredictionsPanelMode;
  placeWagerTabLocked: boolean;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-3.5 w-3.5 shrink-0">
      <path
        d="M4 12h14M12.5 5.5 19 12l-6.5 6.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const WinnerPoolOverview: React.FC<WinnerPoolOverviewProps> = ({ contest, mode }) => {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const isLocked = mode === "locked";

  return (
    <div className="space-y-2 font-display">
      <div className="overflow-hidden rounded-sm bg-white">
        <h2 className="flex items-center gap-1.5 text-lg font-semibold text-slate-900">
          <BrandLogo className="h-6 w-auto shrink-0" />
          Winner Pool
        </h2>
        {isLocked ? (
          <p className="text-sm leading-relaxed text-slate-600">
            Betting is closed. Existing wagers are locked until the contest settles.{" "}
            <Link
              to="/faq#winner-pool"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
            >
              How it works
              <ArrowIcon />
            </Link>
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-600">
              Bet on which lineup will win the contest.
            </p>
            <Link
              to="/faq#winner-pool"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-500"
            >
              How it works
              <ArrowIcon />
            </Link>
          </>
        )}
      </div>

      {/* {hasCommentary && contest.commentary ? (
        <button
          type="button"
          onClick={() => setIsBreakdownOpen(true)}
          className="flex w-full items-start gap-3 overflow-hidden rounded-sm border border-blue-200 bg-white p-3 text-left"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-400 bg-blue-200 text-xl shadow-sm"
          >
            🤖
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Cutbot</span>
            <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">
              Live Analysis
            </span>
          </span>
        </button>
      ) : null} */}

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
