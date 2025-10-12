import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useBalance, useChainId, useChains, useReadContract } from "wagmi";
import { useTournament } from "../contexts/TournamentContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Breadcrumbs } from "../components/common/Breadcrumbs.tsx";
import { ContestCard } from "../components/contest/ContestCard";
import { createExplorerLinkJSX, getContractAddress } from "../utils/blockchainUtils.tsx";
import { useContestQuery } from "../hooks/useContestQuery";
import { LineupManagement } from "../components/contest/LineupManagement";
import { ContestEntryList } from "../components/contest/ContestEntryList";
import { ContestPlayerList } from "../components/contest/ContestPlayerList";
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
        <div className="p-2 mt-1">
          <ContestCard contest={contest} />
        </div>

        {/* tabs */}
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            {isTournamentEditable && (
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
                MY LINEUPS
              </Tab>
            )}
            {!isTournamentEditable && (
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
                Entries ({contest.contestLineups?.length})
              </Tab>
            )}
            {!isTournamentEditable && (
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
                Players
              </Tab>
            )}
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
              Settings
            </Tab>
          </TabList>
          <div className="">
            {/* MY LINEUPS - Only shown when editable */}
            {isTournamentEditable && (
              <TabPanel>
                <div className="p-4">
                  <LineupManagement contest={contest} />
                </div>
              </TabPanel>
            )}

            {/* ENTRIES - Only shown when not editable */}
            {!isTournamentEditable && (
              <TabPanel>
                <ContestEntryList
                  contestLineups={contest?.contestLineups}
                  roundDisplay={contest?.tournament?.roundDisplay}
                  tournamentName={contest?.tournament?.name}
                />
              </TabPanel>
            )}

            {/* PLAYERS - Only shown when NOT editable */}
            {!isTournamentEditable && (
              <TabPanel>
                <ContestPlayerList
                  contest={contest}
                  roundDisplay={contest?.tournament?.roundDisplay}
                />
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
                      <span className="text-sm text-gray-600">Oracle Fee:</span>
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
    </div>
  );
};
