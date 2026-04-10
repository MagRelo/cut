import React, { useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { Link } from "react-router-dom";
import { PlayerDetailModal } from "../player/PlayerDetailModal";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
import { ContestCard } from "../contest/ContestCard";
import { EntryHeader } from "../contest/EntryHeader";
import { PositionBadge } from "../contest/PositionBadge";
import type { PlayerWithTournamentData } from "../../types/player";
import type { ContestLineup } from "../../types/lineup";
import type { Contest } from "../../types/contest";
import { arePrimaryActionsLocked } from "../../types/contest";

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

  const lineupPlayers = lineup.tournamentLineup?.players ?? [];

  // Calculate total points for the lineup
  const totalPoints = lineupPlayers.reduce((sum, player) => {
    return sum + (player.tournamentData?.total || 0);
  }, 0);

  // Sort players by total points (descending)
  const sortedPlayers = [...lineupPlayers].sort((a, b) => {
    const aTotal = a.tournamentData?.total || 0;
    const bTotal = b.tournamentData?.total || 0;
    return bTotal - aTotal;
  });

  const userSettings = lineup.user?.settings;
  const maybeUserColor =
    typeof userSettings === "object" && userSettings !== null
      ? (userSettings as { color?: unknown }).color
      : undefined;
  const userColorHex = typeof maybeUserColor === "string" ? maybeUserColor : undefined;

  return (
    <div className="">
      {/* Header */}

      <EntryHeader
        userName={lineup.user?.name || lineup.user?.email || "Unknown User"}
        lineupName={lineup.tournamentLineup?.name || `Lineup ${lineup.id.slice(-6)}`}
        totalPoints={totalPoints || 0}
        userColorHex={userColorHex}
      />

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
                  : "text-gray-400 hover:border-gray-300 hover:text-gray-700",
              )
            }
          >
            Players ({lineupPlayers.length})
          </Tab>
          <Tab
            className={({ selected }: { selected: boolean }) =>
              classNames(
                "w-full py-1.5 text-sm font-display leading-5",
                "focus:outline-none",
                selected
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-400 hover:border-gray-300 hover:text-gray-700",
              )
            }
          >
            Contests ({contests.length})
          </Tab>
        </TabList>

        <div className="">
          {/* PLAYERS TAB */}
          <TabPanel>
            <div className="mt-2">
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
            <div className="px-2 mt-3 pb-2 space-y-2">
              {contests.length > 0 ? (
                contests.map((contestInfo) => {
                  // Determine if position is "in the money"
                  const totalEntries = contestInfo.contest.contestLineups?.length || 0;
                  const paidPositions = totalEntries < 10 ? 1 : 3;
                  const isInTheMoney =
                    contestInfo.position > 0 && contestInfo.position <= paidPositions;
                  const primaryActionsLocked = arePrimaryActionsLocked(contestInfo.contest.status);

                  return (
                    <div key={contestInfo.contest.id} className="flex items-center gap-3">
                      {/* Position Badge */}
                      <div className="flex-shrink-0">
                        <PositionBadge
                          position={contestInfo.position}
                          isInTheMoney={isInTheMoney}
                          showBorder={true}
                          primaryActionsLocked={primaryActionsLocked}
                        />
                      </div>

                      {/* Contest Card */}
                      <div className="flex-1 min-w-0">
                        <Link to={`/contest/${contestInfo.contest.id}`} className="block">
                          <ContestCard contest={contestInfo.contest} />
                        </Link>
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

      <PlayerDetailModal
        isOpen={isModalOpen}
        onClose={closePlayerModal}
        player={selectedPlayer}
        roundDisplay={roundDisplay || "R1"}
      />
    </div>
  );
};
