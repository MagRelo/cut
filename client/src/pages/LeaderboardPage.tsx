import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useActiveTournament } from "../hooks/useTournamentData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PlayerDetailModal } from "../components/player/PlayerDetailModal";
import { PlayerDisplayRow } from "../components/player/PlayerDisplayRow";
import { TournamentSummaryModal } from "../components/tournament/TournamentSummaryModal";
import type { PlayerWithTournamentData } from "../types/player";
import { sortPlayersByLeaderboard } from "../utils/playerSorting";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export const LeaderboardPage: React.FC = () => {
  const { currentTournament, players, isLoading, error } = useActiveTournament();
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
  const locationDisplay = [currentTournament.city?.trim(), currentTournament.state?.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-4">
      <div className="rounded-t-sm border border-gray-200 bg-white">
        <div className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900">
              {currentTournament.name}
            </h1>
            {/* <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-display text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-200"
            >
              Preview
            </button> */}
          </div>

          <div className="space-y-0.5">
            {currentTournament.course ? (
              <p className="font-display text-base font-medium leading-snug text-gray-700">
                {currentTournament.course}
              </p>
            ) : null}
            {locationDisplay ? (
              <p className="font-display text-sm leading-snug text-gray-500">{locationDisplay}</p>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-sm font-medium text-gray-600">
            <span>{roundDisplay}</span>
            <span className="text-[9px] leading-none text-gray-300" aria-hidden>
              ●
            </span>
            {currentTournament.roundStatusDisplay === "Suspended" ? (
              <span className="inline-flex items-center gap-1 text-gray-600">
                <ExclamationTriangleIcon className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                <span>{currentTournament.roundStatusDisplay || currentTournament.status}</span>
              </span>
            ) : (
              <span>{currentTournament.roundStatusDisplay || currentTournament.status}</span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-b-sm border-x border-b border-gray-200 bg-white">
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
      </div>

      <TournamentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />

      <PlayerDetailModal
        isOpen={isPlayerModalOpen}
        onClose={closePlayerModal}
        player={selectedPlayer}
        roundDisplay={roundDisplay}
      />
    </div>
  );
};
