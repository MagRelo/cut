import React, { useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { Link } from "react-router-dom";
import { PlayerDetailModal } from "../player/PlayerDetailModal";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
import { ContestCard } from "../contest/ContestCard";
import type { PlayerWithTournamentData } from "../../types/player";
import type { ContestLineup } from "../../types/lineup";
import type { Contest } from "../../types/contest";
import { sortPlayersByLeaderboard } from "../../utils/playerSorting";

const DEFAULT_USER_COLOR = "#9CA3AF";

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

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

const TAB_PANEL_MIN_HEIGHT_CLASS = "min-h-[18rem] pt-2 pb-2 flow-root";

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
  const resolvedBorderColor = isValidHexColor(userColorHex) ? userColorHex : DEFAULT_USER_COLOR;
  const canEditLineup = Boolean(isEditable && editHref);

  return (
    <div className="">
      {/* Header */}
      <div
        className="p-3 py-5 font-display"
        style={{
          borderLeftColor: resolvedBorderColor,
          borderLeftWidth: "5px",
          borderLeftStyle: "solid",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-left font-display pl-1">
            <div className="truncate text-xl font-semibold leading-tight text-gray-900">
              {lineup.user?.name || lineup.user?.email || "Unknown User"}
            </div>
            <div className="truncate text-sm leading-tight text-gray-700">
              {lineup.tournamentLineup?.name || `Lineup ${lineup.id.slice(-6)}`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEditLineup ? (
              <Link
                to={editHref!}
                className="mr-1 inline-flex items-center gap-2 rounded border border-blue-500 bg-blue-500 px-3 py-1 text-sm font-display text-white transition-colors hover:bg-blue-600"
              >
                <span>Edit</span>
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </Link>
            ) : (
              <div className="text-right">
                <div className="text-xl font-bold leading-none text-gray-900">{totalPoints}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
                  PTS
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}

      <div className="p-4 pt-0">
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full border-b-2 py-1.5 text-sm font-display leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-700",
                )
              }
            >
              Players ({lineupPlayers.length})
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full border-b-2 py-1.5 text-sm font-display leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-700",
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
            <TabPanel className={TAB_PANEL_MIN_HEIGHT_CLASS}>
              <div className="space-y-1">
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
            <TabPanel className={TAB_PANEL_MIN_HEIGHT_CLASS}>
              <div className="space-y-3">
                {contests.length > 0 ? (
                  contests.map((contestInfo) => {
                    return (
                      <div key={contestInfo.contest.id} className="flex items-center gap-2">
                        {/* Contest Card */}
                        <div className="flex-1 min-w-0 bg-white rounded-sm border border-gray-200 p-3 py-4 shadow">
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
      </div>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isOpen={isModalOpen}
        onClose={closePlayerModal}
        player={selectedPlayer}
        roundDisplay={roundDisplay || "R1"}
      />
    </div>
  );
};
