import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useActiveTournament } from "../hooks/useTournamentData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PageHeader } from "../components/common/PageHeader";
import { PlayerDetailModal } from "../components/player/PlayerDetailModal";
import { PlayerDisplayRow } from "../components/player/PlayerDisplayRow";
import { TournamentSummaryModal } from "../components/tournament/TournamentSummaryModal";
import type { PlayerWithTournamentData } from "../types/player";
import { sortPlayersByLeaderboard } from "../utils/playerSorting";

export const LeaderboardPage: React.FC = () => {
  const { currentTournament, players, isLoading, error } = useActiveTournament();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithTournamentData | null>(null);

  const pgaTourIdParam = searchParams.get("pgaTourId");

  useEffect(() => {
    if (isLoading || !pgaTourIdParam || players.length === 0) return;

    const match = players.find(
      (p) => p.pga_pgaTourId != null && String(p.pga_pgaTourId).trim() === pgaTourIdParam.trim(),
    );
    if (match) {
      setSelectedPlayer(match);
      setIsPlayerModalOpen(true);
    }
  }, [isLoading, pgaTourIdParam, players]);

  const openPlayerModal = (player: PlayerWithTournamentData) => {
    setSelectedPlayer(player);
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
    setSelectedPlayer(null);
    if (searchParams.has("pgaTourId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("pgaTourId");
      setSearchParams(next, { replace: true });
    }
  };

  const sortedPlayers = useMemo(() => {
    const sortByNameOnly = currentTournament?.status === "NOT_STARTED";
    const playersWithName = players.filter((player) => {
      const hasLastName = Boolean((player.pga_lastName || "").trim());
      const hasDisplayName = Boolean((player.pga_displayName || "").trim());
      return hasLastName || hasDisplayName;
    });

    return sortPlayersByLeaderboard(playersWithName, { sortByNameOnly });
  }, [players, currentTournament?.status]);

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

      <div className="bg-white rounded-sm shadow overflow-hidden">
        {sortedPlayers.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <p>No players found.</p>
          </div>
        ) : (
          <div className="px-2 py-3">
            {sortedPlayers.map((player) => (
              <div key={player.id} className="border-b border-gray-200">
                <PlayerDisplayRow
                  player={player}
                  roundDisplay={roundDisplay}
                  onClick={() => openPlayerModal(player)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <PlayerDetailModal
        isOpen={isPlayerModalOpen}
        onClose={closePlayerModal}
        player={selectedPlayer}
        roundDisplay={roundDisplay}
      />
    </div>
  );
};
