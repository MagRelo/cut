import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";

import { type Contest } from "../types.new/contest";

import { useContestApi } from "../services/contestApi";
import { PageHeader } from "../components/util/PageHeader";
import { ContestList } from "../components/contest/ContestList";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useTournament } from "../contexts/TournamentContext";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Contests: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contestApi = useContestApi();
  const { user } = usePortoAuth();
  const { currentTournament } = useTournament();
  const preTournament = currentTournament?.status === "NOT_STARTED";

  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        const data = await contestApi.getAllContests();
        setContests(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching contests:", err);
        setError("Failed to fetch contests");
      } finally {
        setLoading(false);
      }
    };
    fetchContests();
  }, [contestApi]);

  // we need to seperate contests into active, contests, groups, and closed
  const userActiveContests = contests.filter((contest) => {
    if (contest.contestLineups) {
      return contest.contestLineups.some(
        (lineup) => lineup.userId === user?.id && contest.status === "OPEN"
      );
    }
  });
  // closed contests
  const userClosedContests = contests.filter((contest) => {
    if (contest.contestLineups) {
      return contest.contestLineups.some(
        (lineup) => lineup.userId === user?.id && contest.status === "CLOSED"
      );
    }
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-3">
        <PageHeader title="Contests" className="" />
        <Link
          to="/contests/create"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded shadow transition-colors ml-4 whitespace-nowrap"
        >
          New
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <TabGroup>
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
              Live
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
              All Contests
            </Tab>
            {/* <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  'w-full py-2 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'border-b-2 border-emerald-500 text-emerald-600'
                    : 'text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )
              }>
              Groups
            </Tab> */}
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
              Closed
            </Tab>
          </TabList>
          <div className="p-4">
            <TabPanel>
              <ContestList
                contests={userActiveContests}
                loading={loading}
                error={error}
                preTournament={preTournament}
              />
            </TabPanel>
            <TabPanel>
              <ContestList
                contests={contests}
                loading={loading}
                error={error}
                preTournament={true}
              />
            </TabPanel>
            <TabPanel>
              <div className="text-gray-600">Groups will be listed here.</div>
            </TabPanel>
            <TabPanel>
              <div className="text-gray-600">
                <ContestList
                  contests={userClosedContests}
                  loading={loading}
                  error={error}
                  preTournament={preTournament}
                />
              </div>
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
