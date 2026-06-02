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
  const { tournament, players, isLoading, error } = useActiveTournament();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithTournamentData | null>(null);

  const playerIdParam = searchParams.get("playerId");
  const pgaTourIdParam = searchParams.get("pgaTourId");

  useEffect(() => {
    if (isLoading || players.length === 0) return;

    let match: PlayerWithTournamentData | undefined;

    if (playerIdParam?.trim()) {
      const normalizedPlayerId = playerIdParam.trim();
      match = players.find((p) => String(p.id).trim() === normalizedPlayerId);
    }

    if (!match && pgaTourIdParam?.trim()) {
      const normalizedPgaTourId = pgaTourIdParam.trim();
      match = players.find(
        (p) => p.pga_pgaTourId != null && String(p.pga_pgaTourId).trim() === normalizedPgaTourId,
      );
    }

    if (match) {
      setSelectedPlayer(match);
      setIsPlayerModalOpen(true);
    }
  }, [isLoading, playerIdParam, pgaTourIdParam, players]);

  const openPlayerModal = (player: PlayerWithTournamentData) => {
    setSelectedPlayer(player);
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
    setSelectedPlayer(null);
    if (searchParams.has("pgaTourId") || searchParams.has("playerId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("pgaTourId");
      next.delete("playerId");
      setSearchParams(next, { replace: true });
    }
  };

  const sortedPlayers = useMemo(() => {
    const sortByNameOnly = tournament?.status === "NOT_STARTED";
    const playersWithName = players.filter((player) => {
      const hasLastName = Boolean((player.pga_lastName || "").trim());
      const hasDisplayName = Boolean((player.pga_displayName || "").trim());
      return hasLastName || hasDisplayName;
    });

    return sortPlayersByLeaderboard(playersWithName, { sortByNameOnly });
  }, [players, tournament?.status]);

  const header = <PageHeader title="Leaderboard" className="px-4 pt-4" />;

  if (isLoading) {
    return (
      <div>
        {header}
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {header}
        <div className="p-4">
          <ErrorMessage message={error.message} />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div>
        {header}
        <div className="p-4 text-center">
          <p className="text-gray-600">No tournament data available</p>
        </div>
      </div>
    );
  }

  const roundDisplay = tournament.roundDisplay || "R1";

  return (
    <>
      {header}
      {sortedPlayers.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-500">
          <p>No players found.</p>
        </div>
      ) : (
        <div className="p-2 pt-0">
          {sortedPlayers.map((player) => (
            <div key={player.id} className="border-b border-gray-200">
              <div className="p-3">
                <PlayerDisplayRow
                  player={player}
                  roundDisplay={roundDisplay}
                  onClick={() => openPlayerModal(player)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <TournamentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />

      <PlayerDetailModal
        isOpen={isPlayerModalOpen}
        onClose={closePlayerModal}
        player={selectedPlayer}
      />
    </>
  );
};
