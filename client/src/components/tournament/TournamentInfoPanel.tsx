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
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="text-lg font-semibold text-blue-800 font-display">
            Tournament Information
          </div>
        </div>
        <div className="text-sm text-blue-700">
          <p className="mb-2">
            Learn more about {currentTournament.name}, including favorites, key storylines, and
            tournament history.
          </p>
          <button
            onClick={() => setIsSummaryModalOpen(true)}
            className="text-blue-600 hover:text-blue-800 font-medium underline"
          >
            View Tournament Details
          </button>
        </div>
      </div>

      {/* Tournament Summary Modal */}
      <TournamentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />
    </>
  );
};
