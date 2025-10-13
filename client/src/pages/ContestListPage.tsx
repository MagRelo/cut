import React, { useEffect, useState, useMemo } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useChainId } from "wagmi";
// import { Link } from "react-router-dom";

// import { TournamentStatus } from "../types.new/tournament";

import { PageHeader } from "../components/common/PageHeader";
import { ContestList } from "../components/contest/ContestList";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useCurrentTournament } from "../hooks/useTournamentData";
import { useContestsQuery } from "../hooks/useContestQuery";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Contests: React.FC = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const { user } = usePortoAuth();
  const chainId = useChainId();
  const { tournament, isLoading: isTournamentLoading } = useCurrentTournament();

  // Fetch contests filtered by tournament and chain
  const {
    data: contests = [],
    isLoading: isContestsLoading,
    error: contestError,
  } = useContestsQuery(tournament?.id, chainId);

  // Combine loading states - show loading if either query is loading
  const isLoading = isTournamentLoading || isContestsLoading;
  // const error = contestError ? "Failed to fetch contests" : null;
  const error = contestError?.message ?? null;

  // Sort contests by entry fee (highest first)
  const sortedContests = useMemo(() => {
    return [...contests].sort((a, b) => {
      const feeA = a.settings?.fee ?? 0;
      const feeB = b.settings?.fee ?? 0;
      return feeB - feeA; // Descending order
    });
  }, [contests]);

  // Separate contests into user's contests and all contests, then sort
  const userContests = useMemo(() => {
    return sortedContests.filter((contest) => {
      if (contest.contestLineups) {
        return contest.contestLineups.some((lineup) => lineup.userId === user?.id);
      }
      return false;
    });
  }, [sortedContests, user?.id]);

  // Update selected tab when data changes
  useEffect(() => {
    if (!isLoading) {
      const newTabIndex = userContests.length > 0 ? 0 : 1;
      setSelectedTabIndex(newTabIndex);
    }
  }, [userContests.length, isLoading]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Contests" className="" />

      <div className="bg-white rounded-lg shadow">
        <TabGroup selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-display leading-5",
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
                  "w-full py-2 text-sm font-display leading-5",
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
              <ContestList contests={userContests} loading={isLoading} error={error} />
            </TabPanel>
            <TabPanel>
              <ContestList contests={sortedContests} loading={isLoading} error={error} />
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
