import { Fragment, useState } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { PlayerDisplayCard } from "../player/PlayerDisplayCard";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
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
  const [selectedPlayerLineups, setSelectedPlayerLineups] = useState<
    Array<{ userName: string; lineupName: string }>
  >([]);

  const openPlayerModal = (
    player: PlayerWithTournamentData,
    lineups: Array<{ userName: string; lineupName: string }>
  ) => {
    setSelectedPlayer(player);
    setSelectedPlayerLineups(lineups);
    setIsModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
    setSelectedPlayerLineups([]);
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
              lineups: [], // Array to store lineup info
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

          // Track which lineups this player is in
          playerData.lineups.push({
            userName: lineup.user?.name || "Unknown User",
            lineupName: lineup.tournamentLineup?.name || "Unnamed Lineup",
          });
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
        <p className="text-gray-500 font-display">No players found in this contest.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 px-3 mt-2">
        {playersData.map((playerData) => (
          <PlayerDisplayRow
            key={playerData.player.id}
            player={playerData.player}
            roundDisplay={roundDisplay || "R1"}
            onClick={() => openPlayerModal(playerData.player, playerData.lineups)}
            ownershipPercentage={playerData.ownershipPercentage}
          />
        ))}
      </div>

      {/* Player Detail Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
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
                  {/* Header Section */}
                  {/* <div className="px-4 sm:px-6 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors flex-shrink-0"
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
                  </div> */}

                  {/* Content Section */}
                  <div className="max-h-[70vh] overflow-y-auto p-2 bg-slate-50 rounded-sm">
                    {selectedPlayer && (
                      <div className="overflow-hidden">
                        <PlayerDisplayCard
                          player={selectedPlayer}
                          roundDisplay={roundDisplay || "R1"}
                          defaultOpen={true}
                        />

                        {/* Lineups Section */}
                        {selectedPlayerLineups.length > 0 && (
                          <div className="px-4 py-3 mt-3 font-display">
                            <h4 className="text-xs uppercase text-slate-600 font-thin tracking-wide border-b border-slate-300 pb-1 mb-2">
                              In {selectedPlayerLineups.length}{" "}
                              {selectedPlayerLineups.length === 1 ? "Lineup" : "Lineups"}
                            </h4>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                              {selectedPlayerLineups.map((lineup, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-center gap-2 px-3 py-1 text-sm"
                                >
                                  <span className="font-medium text-gray-900">
                                    {lineup.userName}
                                  </span>
                                  <span className="text-gray-600">•</span>
                                  <span className="text-gray-700">{lineup.lineupName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
