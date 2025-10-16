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
        className="w-full bg-emerald-50 border border-emerald-300 rounded-sm shadow p-4 hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-1 mb-2">
          <div
            className="h-8 w-8 bg-contain bg-no-repeat bg-center"
            style={{ backgroundImage: "url(/logo-transparent.png)" }}
            aria-label="CUT logo"
          />
          <div className="text-2xl font-semibold text-emerald-800 font-display">
            {currentTournament.name}
          </div>
        </div>
        <div className="text-sm text-emerald-700">
          <p>
            Learn more about {currentTournament.name}, including favorites, key storylines, and
            tournament history.
          </p>
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
