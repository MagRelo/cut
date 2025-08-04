import React, { useEffect, useState } from "react";
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
  const fetchContest = async () => {
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
  };
  useEffect(() => {
    fetchContest();
  }, [contestId]);

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

        {/* tabs */}
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
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
              {userInContest ? (
                <div>
                  {contest?.contestLineups?.map((contestLineup) => (
                    <ContestLineupCard
                      key={contestLineup.id}
                      contestLineup={contestLineup}
                      roundDisplay={contest?.tournament?.roundDisplay}
                      tournamentStatus={contest?.tournament?.status}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {contest && contest?.tournament?.status !== "IN_PROGRESS" && (
                    <ContestActions contest={contest} onSuccess={setContest} />
                  )}
                </>
              )}
            </TabPanel>
            <TabPanel>
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Tournament Players</h3>
                <div className="text-sm text-gray-600">
                  Player information will be displayed here.
                </div>
              </div>
            </TabPanel>
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

                <hr className="mt-4" />

                {userInContest && <ContestActions contest={contest} onSuccess={setContest} />}
              </div>
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
