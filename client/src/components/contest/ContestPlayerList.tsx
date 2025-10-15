import { Fragment, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { PlayerScorecard } from "../player/PlayerScorecard";
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

  // Format player name as "Last, First"
  const formatPlayerName = (displayName: string | null | undefined): string => {
    if (!displayName) return "Unknown Player";
    const parts = displayName.trim().split(" ");
    if (parts.length === 1) return displayName;
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(" ");
    return `${lastName}, ${firstName}`;
  };

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
        {playersData.map((playerData) => {
          const player = playerData.player;
          const totalPoints =
            (player.tournamentData?.total || 0) +
            (player.tournamentData?.cut || 0) +
            (player.tournamentData?.bonus || 0);

          // Get hot/cold icon from current round
          const getCurrentRoundIcon = () => {
            // Convert roundDisplay (e.g., "R1", "R2") to lowercase key (e.g., "r1", "r2")
            const roundKey = roundDisplay?.toLowerCase() || "r1";
            const roundData =
              player.tournamentData?.[roundKey as keyof typeof player.tournamentData];
            if (roundData && typeof roundData === "object" && "icon" in roundData) {
              return roundData.icon || "";
            }
            return "";
          };

          const icon = getCurrentRoundIcon();

          return (
            <button
              key={player.id}
              onClick={() => openPlayerModal(player, playerData.lineups)}
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                      {formatPlayerName(player.pga_displayName)}
                    </div>
                    {icon && (
                      <span className="text-base flex-shrink-0" title="Player status">
                        {icon}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-700 font-bold mt-0.5 flex items-center gap-1">
                    <span className="min-w-[20px]">
                      {player.tournamentData?.leaderboardPosition || "–"}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span
                      className={
                        player.tournamentData?.leaderboardTotal?.startsWith("-")
                          ? "text-red-600 font-medium"
                          : ""
                      }
                    >
                      {player.tournamentData?.leaderboardTotal || "E"}
                    </span>
                  </div>
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
                <div className="flex-shrink-0 flex items-center gap-1">
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 leading-none">
                      {totalPoints}
                    </div>
                    <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                      PTS
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
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
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all py-1">
                  {/* Header Section */}
                  <div className="px-4 sm:px-6 py-4 bg-white">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        {selectedPlayer?.pga_imageUrl && (
                          <img
                            className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                            src={selectedPlayer.pga_imageUrl}
                            alt={selectedPlayer.pga_displayName || ""}
                          />
                        )}
                        <div>
                          <DialogTitle
                            as="h3"
                            className="text-2xl font-semibold leading-6 text-gray-900"
                          >
                            {formatPlayerName(selectedPlayer?.pga_displayName)}
                          </DialogTitle>
                          <div className="text-sm text-gray-700 font-bold mt-1 flex items-center gap-1">
                            <span className="min-w-[20px]">
                              {selectedPlayer?.tournamentData?.leaderboardPosition || "–"}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span
                              className={
                                selectedPlayer?.tournamentData?.leaderboardTotal?.startsWith("-")
                                  ? "text-red-600 font-medium"
                                  : ""
                              }
                            >
                              {selectedPlayer?.tournamentData?.leaderboardTotal || "E"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors flex-shrink-0"
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
                  <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
                    {selectedPlayer && (
                      <div className="overflow-hidden shadow-sm border-l border-r border-b border-gray-300 rounded-sm">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 divide-x divide-gray-300 bg-white border-t border-b border-gray-300">
                          <div className="px-3 py-2 text-center">
                            <div
                              className={`text-lg font-bold h-7 flex items-center justify-center ${
                                selectedPlayer.tournamentData?.cut &&
                                selectedPlayer.tournamentData.cut > 0
                                  ? "text-green-600"
                                  : "text-gray-900"
                              }`}
                            >
                              {selectedPlayer.tournamentData?.cut &&
                              selectedPlayer.tournamentData.cut > 0
                                ? `+${selectedPlayer.tournamentData.cut}`
                                : selectedPlayer.tournamentData?.cut === 0
                                ? ""
                                : "–"}
                            </div>
                            <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide mt-0.5">
                              Cut Bonus
                            </div>
                          </div>
                          <div className="px-3 py-2 text-center">
                            <div
                              className={`text-lg font-bold h-7 flex items-center justify-center ${
                                selectedPlayer.tournamentData?.bonus &&
                                selectedPlayer.tournamentData.bonus > 0
                                  ? "text-green-600"
                                  : "text-gray-900"
                              }`}
                            >
                              {selectedPlayer.tournamentData?.bonus &&
                              selectedPlayer.tournamentData.bonus > 0
                                ? `+${selectedPlayer.tournamentData.bonus}`
                                : selectedPlayer.tournamentData?.bonus === 0
                                ? ""
                                : "–"}
                            </div>
                            <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide mt-0.5">
                              Position Bonus
                            </div>
                          </div>
                          <div className="px-3 py-2 text-center">
                            <div className="text-lg font-bold text-gray-900">
                              {(selectedPlayer.tournamentData?.total || 0) +
                                (selectedPlayer.tournamentData?.cut || 0) +
                                (selectedPlayer.tournamentData?.bonus || 0)}
                            </div>
                            <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide mt-0.5">
                              Points
                            </div>
                          </div>
                        </div>

                        <div className="">
                          <PlayerScorecard
                            player={selectedPlayer}
                            roundDisplay={roundDisplay || "R1"}
                          />
                        </div>

                        {/* Lineups Section */}
                        {selectedPlayerLineups.length > 0 && (
                          <div className="bg-white px-4 py-3 mt-2 font-display">
                            <h4 className="text-xs uppercase text-gray-500 font-semibold tracking-wide border-b border-gray-300 pb-1 mb-2">
                              In {selectedPlayerLineups.length}{" "}
                              {selectedPlayerLineups.length === 1 ? "Lineup" : "Lineups"}
                            </h4>
                            <div className="space-y-1.5">
                              {selectedPlayerLineups.map((lineup, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-center gap-2 bg-white px-3 py-1 text-sm"
                                >
                                  <span className="font-medium text-gray-900">
                                    {lineup.userName}
                                  </span>
                                  <span className="text-gray-300">•</span>
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
