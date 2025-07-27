import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { formatOrdinal } from "../utils/formatting";
import { useChainId, useReadContract } from "wagmi";
import EscrowContract from "../utils/contracts/Escrow.json";

import { Contest } from "src/types.new/contest";

import { useContestApi } from "../services/contestApi";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { ContestActions } from "../components/contest/ContestActions";
import { ContestLineupCard } from "../components/team/ContestLineupCard";
import { ContestCard } from "../components/contest/ContestCard";
import { createExplorerLinkJSX } from "../utils/blockchain";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
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

  // Get the payment token address from the escrow contract
  const escrowPaymentToken = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "paymentToken",
    args: [],
  }).data as `0x${string}` | undefined;

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
              Details
            </Tab>
          </TabList>
          <div className="p-4">
            <TabPanel>
              {userInContest ? (
                <div>
                  {contest?.contestLineups?.map((contestLineup) => (
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-xl text-gray-400 font-bold flex-shrink-0">
                        {formatOrdinal(contestLineup.position)}
                      </span>

                      <div className="flex-1">
                        <ContestLineupCard
                          key={contestLineup.id}
                          contestLineup={contestLineup}
                          roundDisplay={contest?.tournament?.roundDisplay}
                          tournamentStatus={contest?.tournament?.status}
                        />
                      </div>
                    </div>
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
              <div className="flex flex-col gap-2">
                <p className="text-gray-600 font-medium text-sm">Status: {contest?.status ?? ""}</p>

                <p className="text-gray-600 font-medium text-sm">
                  Fee: {contest?.settings?.fee} {contest?.settings?.paymentTokenSymbol}
                </p>

                <p className="text-gray-600 font-medium text-sm">
                  Max Payout:{" "}
                  {contest?.settings?.maxEntry
                    ? contest?.settings?.maxEntry * contest?.settings?.fee
                    : 0}{" "}
                  {contest?.settings?.paymentTokenSymbol}
                </p>

                <p className="text-gray-600 font-medium text-sm">
                  Entries: {contest?.contestLineups?.length ?? 0}/
                  {String(contest?.settings?.maxEntry ?? 0)}
                </p>

                {/* Blockchain Explorer Links */}
                {contest?.address && chainId && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Blockchain Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Contest Contract:</span>
                        {createExplorerLinkJSX(
                          contest.address,
                          chainId,
                          "View on Explorer",
                          "text-emerald-600 hover:text-emerald-800 underline"
                        )}
                      </div>
                      {escrowPaymentToken && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Payment Token:</span>
                          {createExplorerLinkJSX(
                            escrowPaymentToken,
                            chainId,
                            "View on Explorer",
                            "text-emerald-600 hover:text-emerald-800 underline"
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {userInContest && <ContestActions contest={contest} onSuccess={setContest} />}
              </div>
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
