import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";

import { Contest } from "src/types.new/contest";

import { useContestApi } from "../services/contestApi";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { ContestActions } from "../components/contest/ContestActions";
// import { PlayerTable } from '../components/player/PlayerTable';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const ContestLobby: React.FC = () => {
  const { id: contestId } = useParams<{ id: string }>();
  const { getContestById } = useContestApi();

  // user
  const { user } = usePortoAuth();

  // tabs
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // find user lineup in contest
  const userContestLineup = contest?.contestLineups?.find((lineup) => lineup.userId === user?.id);
  const userInContest = userContestLineup?.userId === user?.id;

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
      <Breadcrumbs
        items={[
          { label: "Contests", path: "/contests" },
          { label: contest?.name ?? "", path: `/contests/${contestId}` },
        ]}
      />

      <div className="bg-white rounded-lg shadow">
        {/* header */}
        <div className="px-4 py-2">
          <h3 className="text-2xl font-semibold text-gray-800">{contest?.name}</h3>
          <p className="text-gray-600 font-medium text-sm">{contest?.tournament?.name ?? ""}</p>
        </div>

        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
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
                  "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Details
            </Tab>
          </TabList>
          <div className="p-6">
            <TabPanel>
              {userInContest ? (
                <div>
                  {contest?.contestLineups?.map((contestLineup) => (
                    <div key={contestLineup.id}>
                      <div className="flex justify-between items-center w-full">
                        <span className="font-medium">{contestLineup.user?.name}</span>
                        <span className="font-semibold">{contestLineup.score || 40}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ContestActions contest={contest} onSuccess={setContest} />
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

                {userInContest && <ContestActions contest={contest} onSuccess={setContest} />}
              </div>
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
