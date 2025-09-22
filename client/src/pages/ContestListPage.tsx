import React, { useEffect, useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
// import { Link } from "react-router-dom";

import { type Contest } from "../types/contest";
// import { TournamentStatus } from "../types.new/tournament";

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
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const contestApi = useContestApi();
  const { user } = usePortoAuth();
  const { currentTournament } = useTournament();

  useEffect(() => {
    const fetchContests = async () => {
      if (!currentTournament) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await contestApi.getAllContests(currentTournament.id);
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
  }, [contestApi, currentTournament]);

  // Separate contests into user's contests and all contests
  const userContests = contests.filter((contest) => {
    if (contest.contestLineups) {
      return contest.contestLineups.some((lineup) => lineup.userId === user?.id);
    }
    return false;
  });

  // Update selected tab when data changes
  useEffect(() => {
    if (!loading) {
      const newTabIndex = userContests.length > 0 ? 0 : 1;
      setSelectedTabIndex(newTabIndex);
    }
  }, [userContests.length, loading]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-3">
        <PageHeader title="Contests" className="" />
        {/* <Link
          to="/contests/create"
          className={`inline-block text-xs font-semibold px-4 py-2 rounded shadow transition-colors ml-4 whitespace-nowrap ${
            currentTournament?.status === TournamentStatus.NOT_STARTED
              ? "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
              : "bg-gray-300 text-gray-400 cursor-not-allowed"
          }`}
          onClick={(e) => {
            if (currentTournament?.status !== TournamentStatus.NOT_STARTED) {
              e.preventDefault();
            }
          }}
          title={
            currentTournament?.status !== TournamentStatus.NOT_STARTED
              ? "Contests can only be created for upcoming tournaments"
              : ""
          }
        >
          New
        </Link> */}
      </div>

      <div className="bg-white rounded-lg shadow">
        <TabGroup selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  selected
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              My Contests
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  selected
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              All Contests
            </Tab>
          </TabList>
          <div className="p-4">
            <TabPanel>
              <ContestList contests={userContests} loading={loading} error={error} />
            </TabPanel>
            <TabPanel>
              <ContestList contests={contests} loading={loading} error={error} />
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
