import { Fragment, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { PlayerDisplayCard } from "../player/PlayerDisplayCard";
import type { Contest } from "../../types/contest";
import type { PlayerWithTournamentData } from "../../types/player";

interface ContestPlayerListProps {
  contest?: Contest;
  roundDisplay?: string;
}

export const ContestPlayerList = ({ contest, roundDisplay }: ContestPlayerListProps) => {
  // player modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithTournamentData | null>(null);

  const openPlayerModal = (player: PlayerWithTournamentData) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
  };

  // Process players data for de-duplication and ownership calculation
  const processPlayersData = () => {
    if (!contest?.contestLineups) return [];

    const playerMap = new Map();
    const totalLineups = contest.contestLineups.length;

    // Aggregate player data from all lineups
    contest.contestLineups.forEach((lineup) => {
      if (lineup.tournamentLineup?.players) {
        lineup.tournamentLineup.players.forEach((player) => {
          const playerId = player.id;

          if (!playerMap.has(playerId)) {
            playerMap.set(playerId, {
              player: {
                ...player,
                ownershipPercentage: 0,
              },
              ownedByLineups: 0,
              ownershipPercentage: 0,
              totalScore: player.tournamentData?.total || 0,
              leaderboardPosition: player.tournamentData?.leaderboardPosition || "–",
              leaderboardTotal: player.tournamentData?.leaderboardTotal || "–",
            });
          }

          // Increment ownership count
          const playerData = playerMap.get(playerId);
          playerData.ownedByLineups += 1;
          playerData.ownershipPercentage = Math.round(
            (playerData.ownedByLineups / totalLineups) * 100
          );
          // Update ownership in the player object as well
          playerData.player.ownershipPercentage = playerData.ownershipPercentage;
        });
      }
    });

    // Convert map to array and sort by points (highest first)
    return Array.from(playerMap.values()).sort((a, b) => {
      const aTotal =
        a.totalScore + (a.player.tournamentData?.cut || 0) + (a.player.tournamentData?.bonus || 0);
      const bTotal =
        b.totalScore + (b.player.tournamentData?.cut || 0) + (b.player.tournamentData?.bonus || 0);
      return bTotal - aTotal;
    });
  };

  const playersData = processPlayersData();

  if (playersData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No players found in this contest.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 px-4 mt-2">
        {playersData.map((playerData) => {
          const player = playerData.player;
          const totalPoints =
            (player.tournamentData?.total || 0) +
            (player.tournamentData?.cut || 0) +
            (player.tournamentData?.bonus || 0);

          // Get hot/cold icon from current round
          const getCurrentRoundIcon = () => {
            const roundData = player.tournamentData?.r1;
            if (roundData && typeof roundData === "object" && "icon" in roundData) {
              return roundData.icon || "";
            }
            return "";
          };

          const icon = getCurrentRoundIcon();

          return (
            <button
              key={player.id}
              onClick={() => openPlayerModal(player)}
              className="w-full bg-white rounded-lg p-3 hover:shadow-md transition-all duration-200 text-left cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Profile Picture */}
                {player.pga_imageUrl && (
                  <div className="flex-shrink-0">
                    <img
                      className="h-10 w-10 rounded-full object-cover"
                      src={player.pga_imageUrl}
                      alt={player.pga_displayName || ""}
                    />
                  </div>
                )}

                {/* Left - Player Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {player.pga_displayName || "Unknown Player"}
                  </div>
                  {icon && (
                    <span className="text-base flex-shrink-0" title="Player status">
                      {icon}
                    </span>
                  )}
                </div>

                {/* Middle - Ownership */}
                <div className="flex-shrink-0 text-right min-w-[3rem]">
                  <div className="text-sm font-bold text-gray-700 leading-none">
                    {playerData.ownershipPercentage}%
                  </div>
                  <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                    OWN
                  </div>
                </div>

                {/* Right - Points */}
                <div className="flex-shrink-0 text-right min-w-[3rem]">
                  <div className="text-lg font-bold text-gray-900 leading-none">{totalPoints}</div>
                  <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                    PTS
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Player Detail Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closePlayerModal}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                  {/* Header Section */}
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <DialogTitle
                          as="h3"
                          className="text-2xl font-semibold leading-6 text-gray-900"
                        >
                          {selectedPlayer?.pga_displayName || "Player Details"}
                        </DialogTitle>
                        <p className="text-sm text-gray-500 mt-1 font-medium text-left">
                          {contest?.tournament?.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        onClick={closePlayerModal}
                      >
                        <span className="sr-only">Close</span>
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="px-4 sm:px-6 py-4 max-h-[70vh] overflow-y-auto bg-gray-50">
                    {selectedPlayer && (
                      <div className="bg-white rounded-lg shadow-sm">
                        <PlayerDisplayCard
                          player={selectedPlayer}
                          roundDisplay={roundDisplay || "R1"}
                        />
                      </div>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
