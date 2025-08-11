import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useBalance, useChainId, useChains } from "wagmi";
import { Contest } from "../types.new/contest";
import { useContestApi } from "../services/contestApi";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { ContestActions } from "../components/contest/ContestActions";
import { ContestLineupCard } from "../components/team/ContestLineupCard";
import { ContestCard } from "../components/contest/ContestCard";
import { createExplorerLinkJSX } from "../utils/blockchain";
import { getContractAddress } from "../utils/contractConfig";

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
  const { getContestById } = useContestApi();
  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const chain = chains.find((chain) => chain.id === chainId);

  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress") ?? "";
  // platformTokenAddress balance
  const { data: platformToken } = useBalance({
    address: platformTokenAddress as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
  });

  // fetch contest
  const fetchContest = useCallback(async () => {
    if (!contestId) return;

    try {
      setIsLoading(true);
      const contest = await getContestById(contestId);
      setContest(contest);
      setError(null);
    } catch (err) {
      setError(`Failed to load contest: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }, [contestId, getContestById]);

  useEffect(() => {
    fetchContest();
  }, [fetchContest]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!contest) {
    return <div>Contest not found</div>;
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
        {contest && contest?.tournament?.status !== "IN_PROGRESS" && !userInContest && (
          <div className="mb-4 px-4">
            <ContestActions
              key={`${contest?.id}-${contest?.contestLineups?.length}`}
              contest={contest}
              onSuccess={setContest}
            />
          </div>
        )}

        {/* tabs */}
        <TabGroup
          key={`${contest?.id}-${contest?.contestLineups?.length}`}
          selectedIndex={selectedIndex}
          onChange={setSelectedIndex}
        >
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Lineups
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Players
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Settings
            </Tab>
          </TabList>
          <div className="p-4">
            <TabPanel>
              <div className="space-y-4">
                {/* Lineups */}
                {contest?.contestLineups?.map((contestLineup) => (
                  <ContestLineupCard
                    key={contestLineup.id}
                    contestLineup={contestLineup}
                    roundDisplay={contest?.tournament?.roundDisplay}
                    tournamentStatus={contest?.tournament?.status}
                  />
                ))}
              </div>
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
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Payout Structure</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      {(() => {
                        const participantCount = contest.contestLineups.length;
                        const payoutStructure = getPayoutStructure(participantCount);
                        // const isLargeContest = participantCount >= 10;

                        return (
                          <div className="space-y-2">
                            {/* <p className="text-xs text-gray-600">
                              {isLargeContest ? "Large Contest" : "Small Contest"} (
                              {participantCount} participants)
                            </p> */}
                            <div className="space-y-1">
                              {Object.entries(payoutStructure).map(([position, percentage]) => (
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
                                    {(percentage / 100).toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

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

                      {/* Max Entries */}
                      {contest?.settings?.maxEntry && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Max Entries:</span>
                          <span className="text-sm text-gray-600">{contest.settings.maxEntry}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Blockchain Explorer Links */}
                <h3 className="text-sm font-medium text-gray-900 mt-4">Blockchain</h3>
                <div className="flex flex-col gap-2 pl-3">
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

                  {/* Chain Name */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Chain:</span>
                    <span className="text-sm text-gray-600">{chain?.name}</span>
                  </div>
                </div>

                <hr className="my-2" />

                {userInContest && (
                  <ContestActions
                    key={`${contest?.id}-${contest?.contestLineups?.length}`}
                    contest={contest}
                    onSuccess={setContest}
                  />
                )}
              </div>
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
