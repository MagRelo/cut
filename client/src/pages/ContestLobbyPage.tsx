import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup, Dialog, Transition } from "@headlessui/react";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Breadcrumbs } from "../components/common/Breadcrumbs.tsx";
import { ContestCard } from "../components/contest/ContestCard";
import { useContestQuery } from "../hooks/useContestQuery";
import { LineupManagement } from "../components/contest/LineupManagement";
import { ContestEntryList } from "../components/contest/ContestEntryList";
import { ContestPlayerList } from "../components/contest/ContestPlayerList";
import { ContestPredictionsTab } from "../components/contest/ContestPredictionsTab";
import { ContestSettings } from "../components/contest/ContestSettings";
import { Connect } from "../components/user/Connect";
import { arePrimaryActionsLocked } from "../types/contest";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const ContestLobby: React.FC = () => {
  const { id: contestId } = useParams<{ id: string }>();
  const { user } = usePortoAuth();

  // React Query - handles all fetching, caching, and refetching automatically!
  const { data: contest, isLoading, error: queryError } = useContestQuery(contestId);

  // Compute action locks based on contest status
  const primaryActionsLocked = contest ? arePrimaryActionsLocked(contest.status) : true;

  // tabs - default to first tab (Contest)
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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

        <div className="p-3 pb-1">
          <ContestCard contest={contest} />
        </div>

        {/* settings button */}
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Contest Settings"
          >
            {/* <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 text-gray-400"
            >
              <path
                fillRule="evenodd"
                d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg> */}

            <span className="font-display text-gray-400">Settings</span>
          </button>
        </div>

        {/* tabs */}
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
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
              Fantasy Contest
            </Tab>
            {primaryActionsLocked && (
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
                    ? "border-b-2 border-purple-500 text-purple-600"
                    : "text-gray-400 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Prediction Market
            </Tab>
          </TabList>
          <div className="">
            {/* ENTRIES (Contest) */}
            <TabPanel>
              <div className="p-2 mt-1">
                {/* Contest Status & Action */}
                {!primaryActionsLocked && (
                  <div className="flex items-center justify-center gap-2 border-b border-gray-200 pb-3">
                    <span className="text-xs text-gray-400 font-display pr-1">
                      Contest Starting Soon:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLineupModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    >
                      MANAGE LINEUPS
                    </button>
                  </div>
                )}

                {/* Contest Entry List */}
                <ContestEntryList
                  contestLineups={contest?.contestLineups}
                  roundDisplay={contest?.tournament?.roundDisplay}
                  contestStatus={contest.status}
                />
              </div>

              {/* LINEUP MANAGEMENT MODAL */}
              <Transition appear show={isLineupModalOpen} as={React.Fragment}>
                <Dialog
                  as="div"
                  className="relative z-50"
                  onClose={() => setIsLineupModalOpen(false)}
                >
                  <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="fixed inset-0 bg-black/30" />
                  </Transition.Child>

                  <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                      <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                      >
                        <Dialog.Panel className="w-full max-w-4xl transform rounded-md bg-white p-4 text-left align-middle shadow-xl transition-all">
                          <div className="mb-2 flex items-center justify-between">
                            <Dialog.Title className="text-lg font-medium text-gray-900">
                              Manage Lineups
                            </Dialog.Title>
                            <button
                              type="button"
                              className="rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                              onClick={() => setIsLineupModalOpen(false)}
                              aria-label="Close"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-5 w-5"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-2">
                            {user ? (
                              <LineupManagement contest={contest} />
                            ) : (
                              <div className="space-y-4 mt-2">
                                <div className="text-center">
                                  <p className="text-gray-600 text-sm font-display">
                                    Sign in to manage lineups
                                  </p>
                                </div>
                                <Connect />
                              </div>
                            )}
                          </div>
                        </Dialog.Panel>
                      </Transition.Child>
                    </div>
                  </div>
                </Dialog>
              </Transition>
            </TabPanel>

            {/* PLAYERS - Only shown when primary actions are locked */}
            {primaryActionsLocked && (
              <TabPanel>
                <ContestPlayerList
                  contest={contest}
                  roundDisplay={contest?.tournament?.roundDisplay}
                />
              </TabPanel>
            )}

            {/* PREDICTIONS */}
            <TabPanel>
              <ContestPredictionsTab contest={contest} />
            </TabPanel>
          </div>
        </TabGroup>
      </div>

      {/* Settings Modal */}
      <Transition appear show={isSettingsModalOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsSettingsModalOpen(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform rounded-md bg-white text-left align-middle shadow-xl transition-all">
                  <div className="p-4 pb-0 flex items-center justify-between border-b border-gray-200">
                    <Dialog.Title className="text-lg font-medium text-gray-900">
                      Contest Details
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                      onClick={() => setIsSettingsModalOpen(false)}
                      aria-label="Close"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto">
                    <ContestSettings contest={contest} />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
