import React, { Fragment, useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { PlayerDisplayCard } from "../player/PlayerDisplayCard";
import { ContestCard } from "../contest/ContestCard";
import type { TournamentLineup, PlayerWithTournamentData } from "../../types/player";
import type { Contest } from "../../types/contest";

interface ContestInfo {
  contest: Contest;
  position: number;
}

interface LineupContestCardProps {
  lineup: TournamentLineup;
  roundDisplay: string;
  contests?: ContestInfo[];
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const LineupContestCard: React.FC<LineupContestCardProps> = ({
  lineup,
  roundDisplay,
  contests = [],
}) => {
  // Tab state
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Player modal state
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

  // Calculate total points for the lineup
  const totalPoints = lineup.players.reduce((sum, player) => {
    return (
      sum +
      (player.tournamentData?.total || 0) +
      (player.tournamentData?.cut || 0) +
      (player.tournamentData?.bonus || 0)
    );
  }, 0);

  // Sort players by total points (descending)
  const sortedPlayers = [...lineup.players].sort((a, b) => {
    const aTotal =
      (a.tournamentData?.total || 0) +
      (a.tournamentData?.cut || 0) +
      (a.tournamentData?.bonus || 0);
    const bTotal =
      (b.tournamentData?.total || 0) +
      (b.tournamentData?.cut || 0) +
      (b.tournamentData?.bonus || 0);
    return bTotal - aTotal;
  });

  // Get hot/cold icon from current round
  const getCurrentRoundIcon = (player: PlayerWithTournamentData) => {
    const roundKey = roundDisplay?.toLowerCase() || "r1";
    const roundData = player.tournamentData?.[roundKey as keyof typeof player.tournamentData];
    if (roundData && typeof roundData === "object" && "icon" in roundData) {
      return roundData.icon || "";
    }
    return "";
  };

  return (
    <div className="">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            {lineup.name || `Lineup ${lineup.id.slice(-6)}`}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 leading-none">{totalPoints}</div>
          <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
            POINTS
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <TabList className="flex space-x-1 border-b border-gray-200">
          <Tab
            className={({ selected }: { selected: boolean }) =>
              classNames(
                "w-full py-1.5 text-sm font-display leading-5",
                "focus:outline-none",
                selected
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-400 hover:border-gray-300 hover:text-gray-700"
              )
            }
          >
            Players ({lineup.players.length})
          </Tab>
          <Tab
            className={({ selected }: { selected: boolean }) =>
              classNames(
                "w-full py-1.5 text-sm font-display leading-5",
                "focus:outline-none",
                selected
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-400 hover:border-gray-300 hover:text-gray-700"
              )
            }
          >
            Contests ({contests.length})
          </Tab>
        </TabList>

        <div className="">
          {/* PLAYERS TAB */}
          <TabPanel>
            <div className="space-y-2 mt-3">
              {sortedPlayers.map((player) => {
                const totalPlayerPoints =
                  (player.tournamentData?.total || 0) +
                  (player.tournamentData?.cut || 0) +
                  (player.tournamentData?.bonus || 0);
                const icon = getCurrentRoundIcon(player);

                return (
                  <button
                    key={player.id}
                    onClick={() => openPlayerModal(player)}
                    className="w-full bg-white rounded-lg p-3 text-left cursor-pointer"
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
                            {player.pga_lastName && player.pga_firstName
                              ? `${player.pga_lastName}, ${player.pga_firstName}`
                              : player.pga_displayName || ""}
                          </div>
                          {icon && (
                            <span className="text-base flex-shrink-0" title="Player status">
                              {icon}
                            </span>
                          )}
                        </div>

                        {/* Leaderboard Position and Total */}
                        <div className="text-xs text-gray-700 font-bold flex items-center gap-2 mt-0.5">
                          <span className="min-w-[20px] text-center">
                            {player.tournamentData.leaderboardPosition || "–"}
                          </span>
                          <span className="text-gray-300 font-medium">|</span>
                          <span
                            className={`min-w-[20px] text-center
                          ${
                            player.tournamentData.leaderboardTotal?.startsWith("-")
                              ? "text-red-600 font-medium"
                              : ""
                          }`}
                          >
                            {player.tournamentData.leaderboardTotal || "E"}
                          </span>
                        </div>
                      </div>

                      {/* Right - Points */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 leading-none">
                            {totalPlayerPoints}
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
          </TabPanel>

          {/* CONTESTS TAB */}
          <TabPanel>
            <div className="space-y-2 mt-4 pb-2">
              {contests.length > 0 ? (
                contests.map((contestInfo) => {
                  // Determine if position is "in the money"
                  const totalEntries = contestInfo.contest.contestLineups?.length || 0;
                  const paidPositions = totalEntries < 10 ? 1 : 3;
                  const isInTheMoney =
                    contestInfo.position > 0 && contestInfo.position <= paidPositions;

                  // Get ordinal suffix for position
                  const getOrdinalSuffix = (num: number) => {
                    const j = num % 10;
                    const k = num % 100;
                    if (j === 1 && k !== 11) return "st";
                    if (j === 2 && k !== 12) return "nd";
                    if (j === 3 && k !== 13) return "rd";
                    return "th";
                  };

                  return (
                    <div key={contestInfo.contest.id} className="flex items-center gap-3">
                      {/* Contest Card */}
                      <div className="flex-1 border bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <ContestCard contest={contestInfo.contest} />
                      </div>

                      {/* Position Badge */}
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div
                            className={`text-center font-bold rounded-full w-10 h-10 flex items-center justify-center ${
                              isInTheMoney
                                ? "text-green-700 border-2 border-green-600 bg-white text-lg"
                                : "text-gray-500 bg-white text-base"
                            }`}
                          >
                            {contestInfo.position > 0 ? (
                              <span>
                                {contestInfo.position}
                                <sup className="text-xs">
                                  {getOrdinalSuffix(contestInfo.position)}
                                </sup>
                              </span>
                            ) : (
                              "–"
                            )}
                          </div>
                          {isInTheMoney && (
                            <div className="absolute -top-0.5 -left-0.5 text-xs text-green-600 font-bold bg-white rounded-full w-4 h-4 flex items-center justify-center">
                              $
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-display">
                    This lineup is not entered in any contests.
                  </p>
                </div>
              )}
            </div>
          </TabPanel>
        </div>
      </TabGroup>

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
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-sm bg-slate-100 shadow-xl transition-all py-1">
                  {/* Header Section */}
                  <div className="px-4 sm:px-6 py-3">
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
                  </div>

                  {/* Content Section */}
                  <div className="max-h-[70vh] overflow-y-auto px-2 pb-4">
                    {selectedPlayer && (
                      <div className="overflow-hidden">
                        <PlayerDisplayCard
                          player={selectedPlayer}
                          roundDisplay={roundDisplay || "R1"}
                          defaultOpen={true}
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
    </div>
  );
};
