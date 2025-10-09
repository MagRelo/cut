import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useBalance, useChainId, useChains } from "wagmi";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useTournament } from "../contexts/TournamentContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { JoinContest } from "../components/contest/JoinContest";
import { LeaveContest } from "../components/contest/LeaveContest";
import { ContestCard } from "../components/contest/ContestCard";
import { createExplorerLinkJSX, getContractAddress } from "../utils/blockchainUtils.tsx";
import { useContestQuery } from "../hooks/useContestQuery";

type SortOption = "ownership" | "points" | "position" | "name" | "score";

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

  // user
  const { user } = usePortoAuth();
  const userContestLineup = contest?.contestLineups?.find((lineup) => lineup.userId === user?.id);
  const userInContest = userContestLineup?.userId === user?.id;

  // tabs
  const [selectedIndex, setSelectedIndex] = useState(0);

  // player list state
  const [sortBy, setSortBy] = useState<SortOption>("ownership");

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
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="space-y-2 p-4">Error: {error}</div>;
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
      <div className="bg-white rounded-lg shadow">
        {/* header */}
        <ContestCard contest={contest} />

        {/* Actions */}
        {contest && isTournamentEditable && !userInContest && (
          <div className="mb-4 px-4">
            <JoinContest contest={contest} />
          </div>
        )}

        {/* tabs */}
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Teams
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Golfers
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Settings
            </Tab>
          </TabList>
          <div className="p-4">
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
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2"></th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lineup
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedLineups.map((lineup) => (
                          <tr key={lineup.id} className="hover:bg-gray-50 transition-colors">
                            <td className="pl-4 pr-1 py-3 whitespace-nowrap">
                              <div
                                className="w-3 h-3 rounded-full border border-gray-300"
                                style={{
                                  backgroundColor:
                                    (lineup.user?.settings?.color as string) || "#D3D3D3",
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-md font-medium text-gray-800">
                                {lineup.user?.name || lineup.user?.email || "Unknown User"}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center text-blue-600">
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
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

            {/* Players */}
            <TabPanel>
              <div className="space-y-4">
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
                              player: player,
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
                        });
                      }
                    });

                    // Convert map to array and sort based on current sort option
                    return Array.from(playerMap.values()).sort((a, b) => {
                      switch (sortBy) {
                        case "ownership": {
                          if (a.ownershipPercentage !== b.ownershipPercentage) {
                            return b.ownershipPercentage - a.ownershipPercentage;
                          }
                          return b.totalScore - a.totalScore;
                        }
                        case "points": {
                          const aTotal =
                            a.totalScore +
                            (a.player.tournamentData?.cut || 0) +
                            (a.player.tournamentData?.bonus || 0);
                          const bTotal =
                            b.totalScore +
                            (b.player.tournamentData?.cut || 0) +
                            (b.player.tournamentData?.bonus || 0);
                          return bTotal - aTotal;
                        }
                        case "position": {
                          const aPos =
                            a.leaderboardPosition === "–"
                              ? 999
                              : parseInt(a.leaderboardPosition) || 999;
                          const bPos =
                            b.leaderboardPosition === "–"
                              ? 999
                              : parseInt(b.leaderboardPosition) || 999;
                          return aPos - bPos;
                        }
                        case "name": {
                          return (a.player.pga_displayName || "").localeCompare(
                            b.player.pga_displayName || ""
                          );
                        }
                        case "score": {
                          const aScore = a.leaderboardTotal;
                          const bScore = b.leaderboardTotal;

                          // Handle special cases like "E" (even par)
                          if (aScore === "E" && bScore === "E") return 0;
                          if (aScore === "E") return -1;
                          if (bScore === "E") return 1;

                          // Handle numeric scores (negative is better in golf)
                          const aNum = parseFloat(aScore) || 999;
                          const bNum = parseFloat(bScore) || 999;
                          return aNum - bNum; // Lower scores first (better golf scores)
                        }
                        default:
                          return 0;
                      }
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
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <button
                            onClick={() => setSortBy("name")}
                            className={`text-sm font-medium hover:text-emerald-600 transition-colors ${
                              sortBy === "name" ? "text-emerald-600" : "text-gray-900"
                            }`}
                          >
                            Player
                          </button>
                        </div>
                        <div className="w-16 text-center">
                          <button
                            onClick={() => setSortBy("ownership")}
                            className={`text-sm font-medium hover:text-emerald-600 transition-colors ${
                              sortBy === "ownership" ? "text-emerald-600" : "text-gray-900"
                            }`}
                          >
                            Own%
                          </button>
                        </div>
                        <div className="w-16 text-center">
                          <button
                            onClick={() => setSortBy("position")}
                            className={`text-sm font-medium hover:text-emerald-600 transition-colors ${
                              sortBy === "position" ? "text-emerald-600" : "text-gray-900"
                            }`}
                          >
                            Pos
                          </button>
                        </div>
                        <div className="w-16 text-center">
                          <button
                            onClick={() => setSortBy("score")}
                            className={`text-sm font-medium hover:text-emerald-600 transition-colors ${
                              sortBy === "score" ? "text-emerald-600" : "text-gray-900"
                            }`}
                          >
                            Score
                          </button>
                        </div>
                        <div className="w-16 text-center">
                          <button
                            onClick={() => setSortBy("points")}
                            className={`text-sm font-medium hover:text-emerald-600 transition-colors ${
                              sortBy === "points" ? "text-emerald-600" : "text-gray-900"
                            }`}
                          >
                            Points
                          </button>
                        </div>
                      </div>

                      {/* Player List */}
                      {playersData.map((playerData) => (
                        <div
                          key={playerData.player.id}
                          className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
                        >
                          {/* Player Info */}
                          <div className="flex-1 flex items-center space-x-3">
                            {playerData.player.pga_imageUrl && (
                              <img
                                className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                                src={playerData.player.pga_imageUrl}
                                alt={playerData.player.pga_displayName || ""}
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {playerData.player.pga_displayName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {playerData.player.pga_country && (
                                  <span className="mr-1">{playerData.player.pga_countryFlag}</span>
                                )}
                                {playerData.player.pga_country}
                              </p>
                            </div>
                          </div>

                          {/* Ownership Percentage */}
                          <div className="w-16 text-center">
                            <span className="text-sm font-medium text-emerald-600">
                              {playerData.ownershipPercentage}%
                            </span>
                          </div>

                          {/* Leaderboard Position */}
                          <div className="w-16 text-center">
                            <span className="text-sm font-medium text-gray-900">
                              {playerData.leaderboardPosition}
                            </span>
                          </div>

                          {/* Leaderboard Total */}
                          <div className="w-16 text-center">
                            <span
                              className={`text-sm font-medium ${
                                playerData.leaderboardTotal === "E" ||
                                !playerData.leaderboardTotal?.toString().startsWith("-")
                                  ? "text-gray-900"
                                  : "text-red-600"
                              }`}
                            >
                              {playerData.leaderboardTotal}
                            </span>
                          </div>

                          {/* Fantasy Points */}
                          <div className="w-16 text-center">
                            <span className="text-sm font-bold text-gray-900">
                              {playerData.totalScore +
                                (playerData.player.tournamentData?.cut || 0) +
                                (playerData.player.tournamentData?.bonus || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </TabPanel>

            {/* Settings */}
            <TabPanel>
              <div className="flex flex-col gap-2">
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

                  {/* Chain Name */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Chain:</span>
                    <span className="text-sm text-gray-600">{chain?.name}</span>
                  </div>

                  {/* Escrow Contract */}
                  {contest?.address && chainId && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Escrow Contract:</span>
                      {createExplorerLinkJSX(
                        contest.address,
                        chainId,
                        "View on Explorer",
                        "text-emerald-600 hover:text-emerald-800 underline text-sm"
                      )}
                    </div>
                  )}
                </div>

                <hr className="my-2" />

                {/* Leave Contest */}
                {userInContest && isTournamentEditable && <LeaveContest contest={contest} />}
              </div>
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
