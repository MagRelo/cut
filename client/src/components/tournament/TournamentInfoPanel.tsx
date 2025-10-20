import React, { useState } from "react";
import { useTournament } from "../../contexts/TournamentContext";
import { TournamentSummaryModal } from "./TournamentSummaryModal";

export const TournamentInfoPanel: React.FC = () => {
  const { currentTournament } = useTournament();
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  if (!currentTournament) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsSummaryModalOpen(true)}
        className="w-full bg-white border border-gray-200 rounded-md p-3 text-left group"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-5 w-5 bg-contain bg-no-repeat bg-center flex-shrink-0 group-hover:opacity-80 transition-opacity"
              style={{ backgroundImage: "url(/logo-transparent.png)" }}
              aria-label="CUT logo"
            />
            <div className="text-sm font-medium text-gray-700 truncate">
              {currentTournament.name}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ">
            <span className="text-xs text-blue-600 group-hover:text-blue-700 transition-colors">
              View info
            </span>
            <svg
              className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors"
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* Tournament Summary Modal */}
      <TournamentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />
    </>
  );
};
