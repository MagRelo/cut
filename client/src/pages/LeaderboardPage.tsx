import React, { useState } from "react";
import { useActiveTournament } from "../hooks/useTournamentData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PageHeader } from "../components/common/PageHeader";
import { PlayerDisplayRow } from "../components/player/PlayerDisplayRow";
import { TournamentSummaryModal } from "../components/tournament/TournamentSummaryModal";

export const LeaderboardPage: React.FC = () => {
  const { currentTournament, players, isLoading, error } = useActiveTournament();
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message={error.message} />
      </div>
    );
  }

  if (!currentTournament) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">No tournament data available</p>
      </div>
    );
  }

  const roundDisplay = currentTournament.roundDisplay || "R1";

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Leaderboard"
        actions={
          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-display py-1 px-3 rounded border border-blue-500 transition-colors text-sm"
          >
            Info
          </button>
        }
      />

      <TournamentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {players.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <p>No players found.</p>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto px-2 py-3">
            {players.map((player) => (
              <PlayerDisplayRow
                key={player.id}
                player={player}
                roundDisplay={roundDisplay}
                showArrow={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
