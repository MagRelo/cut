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
  const isClaim = mode === "claim";
  const [isCommentaryOpen, setIsCommentaryOpen] = useState(false);

  return (
    <>
      <div className="rounded-sm border border-gray-300 bg-gray-50 p-4 pt-3 font-display">
        <h3 className="text-base font-semibold text-gray-900">Winner Pool</h3>

        {isLocked ? (
          <p className="text-sm leading-relaxed text-gray-600">
            Betting is closed. Existing wagers are locked until the contest settles.
            {"  "}
            <Link to="/faq#winner-pool" className="ml-0.5 text-blue-600 hover:underline">
              Learn more...
            </Link>
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-gray-600">
            Bet on which lineup will win the contest. Odds update as money enters the pool - get in
            early to secure a larger share of the pot.{"  "}
            <Link to="/faq#winner-pool" className="ml-0.5 text-blue-600 hover:underline">
              Learn more...
            </Link>
          </p>
        )}

        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Not sure who to pick? Check out the latest analysis:
        </p>

        {contest.commentary ? (
          <button
            type="button"
            className="mt-2 block text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={() => setIsCommentaryOpen(true)}
          >
            Contest Analysis
          </button>
        ) : null}

        {isClaim ? (
          <p className="mt-2 text-sm font-medium text-emerald-700">You have winnings to claim.</p>
        ) : null}
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
