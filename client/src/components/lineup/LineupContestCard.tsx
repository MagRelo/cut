import React, { Fragment, useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { PlayerDisplayCard } from "../player/PlayerDisplayCard";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
import { ContestCard } from "../contest/ContestCard";
import { EntryHeader } from "../contest/EntryHeader";
import { PositionBadge } from "../contest/PositionBadge";
import type { PlayerWithTournamentData } from "../../types/player";
import type { ContestLineup } from "../../types/lineup";
import type { Contest } from "../../types/contest";
import { useTournament } from "../../contexts/TournamentContext";

interface ContestInfo {
  contest: Contest;
  position: number;
}

interface LineupContestCardProps {
  lineup: ContestLineup;
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
  const { isTournamentEditable } = useTournament();
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
  const totalPoints = lineup.tournamentLineup?.players.reduce((sum, player) => {
    return (
      sum +
      (player.tournamentData?.total || 0) +
      (player.tournamentData?.cut || 0) +
      (player.tournamentData?.bonus || 0)
    );
  }, 0);

  // Sort players by total points (descending)
  const sortedPlayers = [...(lineup.tournamentLineup?.players || [])].sort((a, b) => {
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

  return (
    <div className="">
      {/* Header */}
      <div className="mb-3">
        <EntryHeader
          userName={lineup.user?.name || lineup.user?.email || "Unknown User"}
          lineupName={lineup.tournamentLineup?.name || `Lineup ${lineup.id.slice(-6)}`}
          totalPoints={totalPoints || 0}
        />
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
            Players ({lineup.tournamentLineup?.players.length || 0})
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
            <div className="px-2 mt-2">
              {sortedPlayers.map((player) => (
                <PlayerDisplayRow
                  key={player.id}
                  player={player}
                  roundDisplay={roundDisplay}
                  onClick={() => openPlayerModal(player)}
                />
              ))}
            </div>
          </TabPanel>

          {/* CONTESTS TAB */}
          <TabPanel>
            <div className="px-2 mt-3 pb-2">
              {contests.length > 0 ? (
                contests.map((contestInfo) => {
                  // Determine if position is "in the money"
                  const totalEntries = contestInfo.contest.contestLineups?.length || 0;
                  const paidPositions = totalEntries < 10 ? 1 : 3;
                  const isInTheMoney =
                    contestInfo.position > 0 && contestInfo.position <= paidPositions;

                  return (
                    <div key={contestInfo.contest.id} className="flex items-center gap-3">
                      {/* Position Badge */}
                      <div className="flex-shrink-0">
                        <PositionBadge
                          position={contestInfo.position}
                          isInTheMoney={isInTheMoney}
                          showBorder={true}
                          isTournamentEditable={isTournamentEditable}
                        />
                      </div>

                      {/* Contest Card */}
                      <div className="flex-1 border bg-white rounded-sm">
                        <ContestCard contest={contestInfo.contest} />
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
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-sm bg-slate-100 shadow-xl transition-all">
                  {/* Content Section */}
                  <div className="max-h-[70vh] overflow-y-auto p-2">
                    {selectedPlayer && (
                      <div className="overflow-hidden border border-gray-300 rounded-sm">
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
    </div>
  );
};
