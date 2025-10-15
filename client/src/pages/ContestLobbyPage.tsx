import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useTournament } from "../contexts/TournamentContext";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Breadcrumbs } from "../components/common/Breadcrumbs.tsx";
import { ContestCard } from "../components/contest/ContestCard";
import { useContestQuery } from "../hooks/useContestQuery";
import { LineupManagement } from "../components/contest/LineupManagement";
import { ContestEntryList } from "../components/contest/ContestEntryList";
import { ContestPlayerList } from "../components/contest/ContestPlayerList";
import { ContestSettings } from "../components/contest/ContestSettings";
import { Connect } from "../components/user/Connect";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const ContestLobby: React.FC = () => {
  const { id: contestId } = useParams<{ id: string }>();
  const { isTournamentEditable } = useTournament();
  const { user } = usePortoAuth();

  // React Query - handles all fetching, caching, and refetching automatically!
  const { data: contest, isLoading, error: queryError } = useContestQuery(contestId);

  // tabs - default to Entries tab (index 1 when editable, index 0 when not)
  const [selectedIndex, setSelectedIndex] = useState(isTournamentEditable ? 1 : 0);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <div>
          {/* breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Contests", path: "/contests/" }, { label: "Loading Contest..." }]}
          />
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="flex items-center justify-center min-h-[176px]">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="space-y-2 p-4">
        <div>
          {/* breadcrumbs */}
          <Breadcrumbs items={[{ label: "Contests", path: "/contests" }]} />
        </div>

        <div className="bg-white rounded-lg shadow min-h-[176px]">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-lg font-medium text-gray-800 mb-2">Unable to load contest</p>
            <p className="text-sm text-gray-500">{queryError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!contest) {
    return <div className="space-y-2 p-4 font-display">Contest not found</div>;
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
      <div className="bg-white rounded-sm shadow pb-3">
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
                My Lineups
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
              Lineups ({contest.contestLineups?.length})
            </Tab>
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
                  {user ? (
                    <LineupManagement contest={contest} />
                  ) : (
                    <div className="space-y-4 mt-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <svg
                            className="w-5 h-5 text-yellow-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600 text-sm font-display">
                            <b>Sign In</b> to manage lineups
                          </p>
                        </div>
                      </div>
                      <Connect />
                    </div>
                  )}
                </div>
              </TabPanel>
            )}

            {/* ENTRIES */}
            <TabPanel>
              <ContestEntryList
                contestLineups={contest?.contestLineups}
                roundDisplay={contest?.tournament?.roundDisplay}
              />
            </TabPanel>

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
              <ContestSettings contest={contest} />
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
