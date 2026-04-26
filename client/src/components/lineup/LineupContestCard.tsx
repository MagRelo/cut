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
import { sortPlayersByLeaderboard } from "../../utils/playerSorting";

interface ContestInfo {
  contest: Contest;
  position: number;
}

interface LineupContestCardProps {
  lineup: ContestLineup;
  roundDisplay: string;
  contests?: ContestInfo[];
  isEditable?: boolean;
  editHref?: string;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const LineupContestCard: React.FC<LineupContestCardProps> = ({
  lineup,
  roundDisplay,
  contests = [],
  isEditable = false,
  editHref,
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

  const sortedPlayers = sortPlayersByLeaderboard(lineupPlayers);

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
            <span className="inline-flex items-center gap-1">
              <span>Contests ({contests.length})</span>
              {contests.length === 0 ? (
                <span
                  className="inline-flex items-center rounded bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"
                  title="No contests for this lineup"
                  aria-label="Warning: lineup has no contests"
                >
                  !
                </span>
              ) : null}
            </span>
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
              {isEditable && editHref ? (
                <div className="mt-4 flex justify-center">
                  <Link
                    to={editHref}
                    className="inline-flex items-center rounded border border-blue-500 bg-blue-500 px-3 py-1 text-xs font-display text-white transition-colors hover:bg-blue-600"
                  >
                    Edit Lineup
                  </Link>
                </div>
              ) : null}
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
                <div className="rounded-sm border border-gray-200 bg-white p-4 shadow">
                  <p className="mb-1 font-display text-base font-semibold text-gray-900">
                    This lineup is not entered in any contests.
                  </p>
                  <p className="font-display text-sm leading-relaxed text-gray-600">
                    Browse available contests and enter your lineup.
                  </p>
                  <Link
                    to="/contests"
                    className="mt-3 inline-block rounded border border-blue-500 bg-blue-500 px-3 py-1 text-xs font-display text-white transition-colors hover:bg-blue-600"
                  >
                    Browse Contests
                  </Link>
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
