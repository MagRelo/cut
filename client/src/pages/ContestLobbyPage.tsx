import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
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
import { arePrimaryActionsLocked } from "../types/contest";
import { ContestResultsPanel } from "../components/contest/ContestResultsPanel";
import { Timeline } from "../components/contest/Timeline";
import { useContestTimelineQuery } from "../hooks/useContestTimelineQuery";
import { Modal } from "../components/common/Modal";
import { ContestPayoutsModal } from "../components/contest/ContestPayoutsModal";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const ContestLobby: React.FC = () => {
  const { id: contestId } = useParams<{ id: string }>();
  const { user } = usePortoAuth();

  // React Query - handles all fetching, caching, and refetching automatically!
  const {
    data: contest,
    isLoading,
    error: queryError,
    refetch: refetchContest,
  } = useContestQuery(contestId);

  // Compute action locks based on contest status
  const primaryActionsLocked = contest ? arePrimaryActionsLocked(contest.status) : true;

  // tabs - default to first tab (Contest)
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isPayoutsModalOpen, setIsPayoutsModalOpen] = useState(false);

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

        {/* settings, timeline, and payouts buttons */}
        <div className="flex justify-start px-2 my-1 gap-2">
          {/* TIMELINE BUTTON */}
          <button
            type="button"
            onClick={() => setIsTimelineModalOpen(true)}
            className="flex items-center ml-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Contest Timeline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 text-gray-400 mr-1"
            >
              {/* X-axis */}
              <line x1="2" y1="16" x2="18" y2="16" stroke="currentColor" strokeWidth="1.5" />
              {/* Y-axis */}
              <line x1="2" y1="4" x2="2" y2="16" stroke="currentColor" strokeWidth="1.5" />
              {/* Green sine wave */}
              <path
                d="M 2 10 Q 4 6, 6 10 T 10 10 T 14 10 T 18 10"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-display text-gray-400">Timeline</span>
          </button>

          {/* PAYOUTS BUTTON */}
          <button
            type="button"
            onClick={() => setIsPayoutsModalOpen(true)}
            className="flex items-center ml-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Contest Payouts"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 text-[#10b981] mr-1"
            >
              <path
                d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                clipRule="evenodd"
                fill="currentColor"
              />
            </svg>
            <span className="font-display text-gray-400">Payouts</span>
          </button>

          {/* SETTINGS BUTTON */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center ml-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Contest Settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 text-gray-400 mr-1"
            >
              <path
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path d="M8 2v4a2 2 0 002 2h4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
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
              Lineups
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
            {contest.status === "SETTLED" && (
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
                Results
              </Tab>
            )}
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
                  contestAddress={contest.address}
                  contestChainId={contest.chainId}
                  contest={contest}
                />
              </div>

              {/* LINEUP MANAGEMENT MODAL */}
              <Modal
                isOpen={isLineupModalOpen}
                onClose={() => setIsLineupModalOpen(false)}
                title="Manage Lineups"
                maxWidth="4xl"
                contentClassName="p-0"
              >
                {user ? <LineupManagement contest={contest} /> : <Connect />}
              </Modal>
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
            {contest.status === "SETTLED" && (
              <TabPanel>
                <div className="p-3">
                  <ContestResultsPanel contest={contest} onRefreshContest={refetchContest} />
                </div>
              </TabPanel>
            )}
          </div>
        </TabGroup>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Settings"
        maxWidth="2xl"
        scrollable
        maxHeight="600px"
        contentClassName="p-0"
      >
        <ContestSettings contest={contest} />
      </Modal>

      {/* Timeline Modal */}
      <Modal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        title="Timeline"
        maxWidth="4xl"
      >
        <TimelineModalContent contestId={contestId} />
      </Modal>

      {/* Payouts Modal */}
      <ContestPayoutsModal
        isOpen={isPayoutsModalOpen}
        onClose={() => setIsPayoutsModalOpen(false)}
        contest={contest}
      />
    </div>
  );
};

// Timeline Modal Content Component
const TimelineModalContent: React.FC<{ contestId: string | undefined }> = ({ contestId }) => {
  const {
    data: timelineData,
    isLoading,
    error: timelineError,
  } = useContestTimelineQuery(contestId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "300px" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (timelineError) {
    return (
      <div
        className="flex flex-col items-center justify-center p-8 text-center"
        style={{ height: "300px" }}
      >
        <p className="text-lg font-medium text-gray-800 mb-2">Unable to load timeline</p>
        <p className="text-sm text-gray-500">
          {timelineError instanceof Error ? timelineError.message : "Failed to fetch timeline data"}
        </p>
      </div>
    );
  }

  if (!timelineData || !timelineData.teams || timelineData.teams.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: "300px" }}>
        <div className="text-gray-500">No timeline data available</div>
      </div>
    );
  }

  return <Timeline timelineData={timelineData} />;
};
