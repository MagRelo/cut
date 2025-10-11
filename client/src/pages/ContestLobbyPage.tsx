import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useBalance, useChainId, useChains, useReadContract } from "wagmi";
import { useTournament } from "../contexts/TournamentContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { ContestCard } from "../components/contest/ContestCard";
import { createExplorerLinkJSX, getContractAddress } from "../utils/blockchainUtils.tsx";
import { useContestQuery } from "../hooks/useContestQuery";
import { LineupModal } from "../components/lineup/LineupModal";
import { LineupManagement } from "../components/contest/LineupManagement";
import { type TournamentLineup } from "../types/player";
import { type ContestLineup } from "../types/lineup";
import EscrowContract from "../utils/contracts/Escrow.json";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

// Function to get payout structure based on contest size
function getPayoutStructure(participantCount: number) {
  const isLargeContest = participantCount >= 10;

  if (isLargeContest) {
    return {
      "1": 7000, // 70% for winner
      "2": 2000, // 20% for second place
      "3": 1000, // 10% for third place
    };
  } else {
    return {
      "1": 10000, // 100% for winner (small contests)
    };
  }
}

export const ContestLobby: React.FC = () => {
  const { id: contestId } = useParams<{ id: string }>();
  const { isTournamentEditable } = useTournament();

  // React Query - handles all fetching, caching, and refetching automatically!
  const { data: contest, isLoading, error: queryError } = useContestQuery(contestId);

  // tabs
  const [selectedIndex, setSelectedIndex] = useState(0);

  // lineup modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLineup, setSelectedLineup] = useState<{
    lineup: TournamentLineup;
    userName: string;
  } | null>(null);
  const openLineupModal = (contestLineup: ContestLineup) => {
    if (contestLineup.tournamentLineup) {
      setSelectedLineup({
        lineup: contestLineup.tournamentLineup,
        userName: contestLineup.user?.name || contestLineup.user?.email || "Unknown User",
      });
      setIsModalOpen(true);
    }
  };
  const closeLineupModal = () => {
    setIsModalOpen(false);
    setSelectedLineup(null);
  };

  // blockchain data
  const chainId = useChainId();
  const chains = useChains();
  const chain = chains.find((c: { id: number }) => c.id === chainId);

  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress") ?? "";
  // platformTokenAddress balance
  const { data: platformToken } = useBalance({
    address: platformTokenAddress as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
  });

  // Get escrow contract details (including expiration)
  const escrowDetails = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "details",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as [bigint, bigint] | undefined;

  // Chain validation
  const error =
    contest && contest.chainId !== chainId
      ? `This contest is on a different network. Expected chain ${contest.chainId}, but you're connected to chain ${chainId}.`
      : queryError
      ? `Failed to load contest: ${
          queryError instanceof Error ? queryError.message : "Unknown error"
        }`
      : null;

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <div>
          {/* breadcrumbs */}
          <p className="text-gray-500 text-sm text-display">Loading Contest...</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="flex items-center justify-center min-h-[176px]">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 p-4">
        <div>
          {/* breadcrumbs */}
          <Breadcrumbs items={[{ label: "Contests", path: "/contests" }]} />
        </div>

        <div className="bg-white rounded-lg shadow min-h-[176px]">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-lg font-medium text-gray-800 mb-2">Unable to load contest</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!contest) {
    return <div className="space-y-2 p-4">Contest not found</div>;
  }

  return (
    <div className="space-y-2 p-4">
      {/* breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Contests", path: "/contests" },
          { label: contest?.name ?? "", path: `/contests/${contestId}` },
        ]}
      />

      {/* contest lobby */}
      <div className="bg-white rounded-lg shadow pb-1">
        {/* header */}
        <div className="px-4 pt-4 mb-3">
          <ContestCard contest={contest} />
        </div>

        {/* tabs */}
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            {isTournamentEditable && (
              <Tab
                className={({ selected }: { selected: boolean }) =>
                  classNames(
                    "w-full py-1.5 text-sm font-medium leading-5",
                    "focus:outline-none",
                    selected
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-400 hover:border-gray-300 hover:text-gray-700"
                  )
                }
              >
                MY LINEUPS
              </Tab>
            )}
            {!isTournamentEditable && (
              <Tab
                className={({ selected }: { selected: boolean }) =>
                  classNames(
                    "w-full py-1.5 text-sm font-medium leading-5",
                    "focus:outline-none",
                    selected
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-400 hover:border-gray-300 hover:text-gray-700"
                  )
                }
              >
                ENTRIES ({contest.contestLineups?.length})
              </Tab>
            )}
            {!isTournamentEditable && (
              <Tab
                className={({ selected }: { selected: boolean }) =>
                  classNames(
                    "w-full py-1.5 text-sm font-medium leading-5",
                    "focus:outline-none",
                    selected
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-400 hover:border-gray-300 hover:text-gray-700"
                  )
                }
              >
                PLAYERS
              </Tab>
            )}
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-1.5 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-400 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              INFO
            </Tab>
          </TabList>
          <div className="">
            {/* MY LINEUPS - Only shown when editable */}
            {isTournamentEditable && (
              <TabPanel>
                <LineupManagement contest={contest} />
              </TabPanel>
            )}

            {/* ENTRIES - Only shown when not editable */}
            {!isTournamentEditable && (
              <TabPanel>
                {(() => {
                  // Calculate total points for each lineup and sort by points
                  const lineupsWithPoints =
                    contest?.contestLineups?.map((lineup) => {
                      const totalPoints =
                        lineup.tournamentLineup?.players?.reduce((sum, player) => {
                          const playerTotal = player.tournamentData?.total || 0;
                          const cut = player.tournamentData?.cut || 0;
                          const bonus = player.tournamentData?.bonus || 0;
                          return sum + playerTotal + cut + bonus;
                        }, 0) || 0;

                      return {
                        ...lineup,
                        totalPoints,
                      };
                    }) || [];

                  // Sort by points (highest first)
                  const sortedLineups = [...lineupsWithPoints].sort(
                    (a, b) => b.totalPoints - a.totalPoints
                  );

                  if (sortedLineups.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No teams in this contest yet</p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Lineup
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Points
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sortedLineups.map((lineup) => (
                            <tr key={lineup.id} className="hover:bg-gray-50 transition-colors">
                              <td className="pl-4 pr-2 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="text-md font-medium text-gray-800">
                                    {lineup.user?.name || lineup.user?.email || "Unknown User"}
                                  </div>
                                  <button
                                    onClick={() => openLineupModal(lineup)}
                                    className="text-gray-400 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-1"
                                    title="View lineup"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                    </svg>
                                  </button>

                                  {/* <div
                                    className="w-3 h-3 rounded-full border border-gray-300"
                                    style={{
                                      backgroundColor:
                                        (lineup.user?.settings?.color as string) || "#D3D3D3",
                                    }}
                                  /> */}
                                </div>
                              </td>
                              <td className="px-2 py-3 whitespace-nowrap text-center">
                                <span className="text-sm font-bold text-gray-900">
                                  {lineup.totalPoints}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </TabPanel>
            )}

            {/* PLAYERS - Only shown when NOT editable */}
            {!isTournamentEditable && (
              <TabPanel>
                {(() => {
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
                              leaderboardPosition:
                                player.tournamentData?.leaderboardPosition || "–",
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
                        a.totalScore +
                        (a.player.tournamentData?.cut || 0) +
                        (a.player.tournamentData?.bonus || 0);
                      const bTotal =
                        b.totalScore +
                        (b.player.tournamentData?.cut || 0) +
                        (b.player.tournamentData?.bonus || 0);
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
                    <div className="overflow-x-auto ">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="pl-4 pr-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Player
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              OWN%
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              PTS
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {playersData.map((playerData) => {
                            const player = playerData.player;
                            const totalPoints =
                              (player.tournamentData?.total || 0) +
                              (player.tournamentData?.cut || 0) +
                              (player.tournamentData?.bonus || 0);

                            // Get hot/cold icon from current round
                            const getCurrentRoundIcon = () => {
                              const roundData = player.tournamentData?.r1;
                              if (
                                roundData &&
                                typeof roundData === "object" &&
                                "icon" in roundData
                              ) {
                                return roundData.icon || "";
                              }
                              return "";
                            };

                            const icon = getCurrentRoundIcon();

                            return (
                              <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                                <td className="pl-4 pr-2 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-800">
                                      {player.pga_displayName || "Unknown Player"}
                                    </span>
                                    <button
                                      className="text-gray-500 hover:text-gray-800 transition-colors"
                                      title="View scorecard (coming soon)"
                                      disabled
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                    </button>
                                    {icon && (
                                      <span className="text-lg text-gray-400" title="Player status">
                                        {icon}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-center">
                                  <span className="text-sm text-gray-700">
                                    {playerData.ownershipPercentage}%
                                  </span>
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-center">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {totalPoints}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </TabPanel>
            )}

            {/* INFO */}
            <TabPanel>
              <div className="flex flex-col gap-2 p-4">
                {/* Payout Structure */}
                {contest?.contestLineups && (
                  <div className="">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Payouts</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      {(() => {
                        const participantCount = contest.contestLineups.length;
                        const payoutStructure = getPayoutStructure(participantCount);

                        // Calculate total prize pool
                        const entryFee = contest.settings?.fee || 0;
                        const totalPrizePool = entryFee * participantCount;

                        // Deduct oracle fee from total
                        const oracleFee = contest.settings?.oracleFee || 0;
                        const oracleFeeAmount = (totalPrizePool * oracleFee) / 10000;
                        const remainingForPayouts = totalPrizePool - oracleFeeAmount;

                        return (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              {Object.entries(payoutStructure).map(([position, percentage]) => {
                                const payoutAmount = (remainingForPayouts * percentage) / 10000;
                                return (
                                  <div key={position} className="flex justify-between text-sm">
                                    <span className="text-gray-700">
                                      {position === "1"
                                        ? "1st Place"
                                        : position === "2"
                                        ? "2nd Place"
                                        : position === "3"
                                        ? "3rd Place"
                                        : `${position}th Place`}
                                    </span>
                                    <span className="font-medium text-emerald-600">
                                      ${payoutAmount.toFixed(2)} {platformToken?.symbol}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Contest Settings */}
                <h3 className="text-sm font-medium text-gray-900 mb-2 mt-4">Contest Details</h3>
                <div className="flex flex-col gap-2 pl-3">
                  {/* Entry Fee */}
                  {contest?.settings?.fee && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Entry Fee:</span>
                      <span className="text-sm text-gray-600">
                        ${contest.settings.fee} {platformToken?.symbol}
                      </span>
                    </div>
                  )}

                  {/* Oracle Fee */}
                  {contest?.settings?.oracleFee !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Data Oracle Fee:</span>
                      <span className="text-sm text-gray-600">
                        {contest.settings.oracleFee / 100}%
                      </span>
                    </div>
                  )}

                  {/* Expiration */}
                  {escrowDetails && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Expires:</span>
                      <span className="text-sm text-gray-600">
                        {new Date(Number(escrowDetails[1])).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Escrow Contract */}
                  {contest?.address && chainId && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Contract:</span>
                      {createExplorerLinkJSX(
                        contest.address,
                        chainId,
                        "View on Explorer",
                        "text-emerald-600 hover:text-emerald-800 underline text-sm"
                      )}
                    </div>
                  )}

                  {/* Chain Name */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Chain:</span>
                    <span className="text-sm text-gray-600">{chain?.name}</span>
                  </div>
                </div>
              </div>
            </TabPanel>
          </div>
        </TabGroup>
      </div>

      {/* Lineup Modal */}
      <LineupModal
        isOpen={isModalOpen}
        onClose={closeLineupModal}
        lineup={selectedLineup?.lineup || null}
        roundDisplay={contest?.tournament?.roundDisplay || ""}
        userName={selectedLineup?.userName}
      />
    </div>
  );
};
