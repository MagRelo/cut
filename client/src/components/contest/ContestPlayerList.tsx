import { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import { PlayerDisplayCard } from "../player/PlayerDisplayCard";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import type { Contest } from "../../types/contest";
import type { PlayerWithTournamentData } from "../../types/player";
import { PlayerScorecard } from "../player/PlayerScorecard";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

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

interface ContestPlayerListProps {
  contest?: Contest;
  roundDisplay?: string;
}

export const ContestPlayerList = ({ contest, roundDisplay }: ContestPlayerListProps) => {
  const { user } = usePortoAuth();

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
              isOwnedByCurrentUser: false,
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

          // Check if current user owns this player
          if (lineup.userId === user?.id) {
            playerData.isOwnedByCurrentUser = true;
          }

          // Track which lineups this player is in
          playerData.lineups.push({
            userName: lineup.user?.name || "Unknown User",
            lineupName: lineup.tournamentLineup?.name || "Unnamed Lineup",
          });
        });
      }
    });

    // Convert map to array and sort with leaderboard logic.
    return Array.from(playerMap.values()).sort((a, b) => {
      const sortIndexDiff = getPlayerSortIndex(a.player) - getPlayerSortIndex(b.player);
      if (sortIndexDiff !== 0) return sortIndexDiff;

      const positionDiff = getNumericPosition(a.player) - getNumericPosition(b.player);
      if (positionDiff !== 0) return positionDiff;

      const aName =
        a.player.pga_displayName ||
        `${a.player.pga_lastName || ""} ${a.player.pga_firstName || ""}`.trim();
      const bName =
        b.player.pga_displayName ||
        `${b.player.pga_lastName || ""} ${b.player.pga_firstName || ""}`.trim();
      return aName.localeCompare(bName);
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
      <div className="px-2 mt-3">
        {playersData.map((playerData) => (
          <div key={playerData.player.id} className="border-b border-gray-200">
            <PlayerDisplayRow
              player={playerData.player}
              roundDisplay={roundDisplay || "R1"}
              onClick={() => openPlayerModal(playerData.player, playerData.lineups)}
              ownershipPercentage={playerData.ownershipPercentage}
              isOwnedByCurrentUser={playerData.isOwnedByCurrentUser}
            />
          </div>
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
                  {/* Content Section */}
                  <div className="bg-gray-100 p-2">
                    {selectedPlayer && (
                      <div className="overflow-hidden border border-gray-300 rounded-sm">
                        <PlayerDisplayCard
                          player={selectedPlayer}
                          roundDisplay={roundDisplay || "R1"}
                        />

                        <TabGroup className="">
                          <TabList className="flex space-x-1 border-b border-gray-200 px-4 bg-white rounded-t-sm">
                            <Tab
                              className={({ selected }: { selected: boolean }) =>
                                classNames(
                                  "w-full py-2 text-sm font-display leading-5",
                                  "focus:outline-none",
                                  selected
                                    ? "border-b-2 border-blue-600 text-blue-700"
                                    : "text-gray-400 hover:text-gray-800"
                                )
                              }
                            >
                              Scorecard
                            </Tab>
                            <Tab
                              className={({ selected }: { selected: boolean }) =>
                                classNames(
                                  "w-full py-2 text-sm font-display leading-5",
                                  "focus:outline-none",
                                  selected
                                    ? "border-b-2 border-blue-600 text-blue-700"
                                    : "text-gray-400 hover:text-gray-800"
                                )
                              }
                            >
                              Lineups ({selectedPlayerLineups.length})
                            </Tab>
                          </TabList>

                          <TabPanels>
                            <TabPanel>
                              <div className="h-[184px] overflow-y-auto bg-slate-50">
                                {/* Scorecard Section */}
                                <div>
                                  <PlayerScorecard
                                    player={selectedPlayer}
                                    roundDisplay={roundDisplay || "R1"}
                                  />
                                </div>
                              </div>
                            </TabPanel>

                            <TabPanel>
                              <div className="h-[184px] overflow-y-auto bg-slate-50">
                                {selectedPlayerLineups.length > 0 ? (
                                  <div className="px-4 py-3 font-display">
                                    <div className="space-y-1.5">
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
                                ) : (
                                  <div className="text-center py-8">
                                    <p className="text-gray-500 font-display">No lineups found.</p>
                                  </div>
                                )}
                              </div>
                            </TabPanel>
                          </TabPanels>
                        </TabGroup>
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
