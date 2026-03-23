import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { useActiveTournament } from "../hooks/useTournamentData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PageHeader } from "../components/common/PageHeader";
import { PlayerDisplayRow } from "../components/player/PlayerDisplayRow";
import { PlayerDisplayCard } from "../components/player/PlayerDisplayCard";
import { PlayerScorecard } from "../components/player/PlayerScorecard";
import { TournamentSummaryModal } from "../components/tournament/TournamentSummaryModal";
import type { PlayerWithTournamentData } from "../types/player";

const PLAYER_SORT_BUCKET = {
  noData: 205,
  wd: 203,
  cut: 202,
  noPosition: 201,
} as const;

const getPlayerSortIndex = (player?: PlayerWithTournamentData | null) => {
  if (!player) return PLAYER_SORT_BUCKET.noData;

  const score = player.tournamentData?.leaderboardTotal?.trim();
  const position = player.tournamentData?.leaderboardPosition?.trim().toUpperCase();

  if (!score) return PLAYER_SORT_BUCKET.noData;
  if (position === "WD") return PLAYER_SORT_BUCKET.wd;
  if (position === "CUT") return PLAYER_SORT_BUCKET.cut;
  if (position === "-") return PLAYER_SORT_BUCKET.noPosition;
  if (score === "E") return 0;

  const numericScore = Number.parseInt(score, 10);
  return Number.isNaN(numericScore) ? PLAYER_SORT_BUCKET.noData : numericScore;
};

const getNumericPosition = (player: PlayerWithTournamentData) => {
  const rawPosition = player.tournamentData?.leaderboardPosition?.trim().toUpperCase() || "";
  const normalizedPosition = rawPosition.startsWith("T") ? rawPosition.slice(1) : rawPosition;
  const parsedPosition = Number.parseInt(normalizedPosition, 10);
  return Number.isNaN(parsedPosition) ? Number.POSITIVE_INFINITY : parsedPosition;
};

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
      (p) =>
        p.pga_pgaTourId != null && String(p.pga_pgaTourId).trim() === pgaTourIdParam.trim(),
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

    return [...playersWithName].sort((a, b) => {
      if (!sortByNameOnly) {
        const sortIndexDiff = getPlayerSortIndex(a) - getPlayerSortIndex(b);
        if (sortIndexDiff !== 0) return sortIndexDiff;

        const positionDiff = getNumericPosition(a) - getNumericPosition(b);
        if (positionDiff !== 0) return positionDiff;
      }

      // Stable fallback: last name only (requested behavior).
      const aLastName = (a.pga_lastName || "").trim();
      const bLastName = (b.pga_lastName || "").trim();
      const lastNameDiff = aLastName.localeCompare(bLastName);
      if (lastNameDiff !== 0) return lastNameDiff;

      // Final deterministic tie-break when last names match/missing.
      const aFirstName = (a.pga_firstName || a.pga_displayName || "").trim();
      const bFirstName = (b.pga_firstName || b.pga_displayName || "").trim();
      return aFirstName.localeCompare(bFirstName);
    });
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

      <Transition appear show={isPlayerModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closePlayerModal}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden transition-all py-1">
                  <div className="bg-gray-100 p-2">
                    {selectedPlayer && (
                      <div className="overflow-hidden border border-gray-300 rounded-sm">
                        <PlayerDisplayCard player={selectedPlayer} roundDisplay={roundDisplay} />
                        <div className="h-[184px] overflow-y-auto bg-slate-50">
                          <PlayerScorecard player={selectedPlayer} roundDisplay={roundDisplay} />
                        </div>
                      </div>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
