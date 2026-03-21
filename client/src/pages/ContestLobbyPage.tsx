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
import { ContestSettings } from "../components/contest/ContestSettings";
import { Connect } from "../components/user/Connect";
import { arePrimaryActionsLocked } from "../types/contest";
import { ContestResultsPanel } from "../components/contest/ContestResultsPanel";
import { Timeline } from "../components/contest/Timeline";
import { useContestTimelineQuery } from "../hooks/useContestTimelineQuery";
import { Modal } from "../components/common/Modal";
import { ContestPayoutsModal } from "../components/contest/ContestPayoutsModal";
import { PredictionLineupsList } from "../components/contest/PredictionLineupsList";

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
      <div className="bg-white rounded-sm shadow pt-2">
        {/* header */}

        <div className="p-3 pb-1">
          <ContestCard
            contest={contest}
            onPotClick={() => setIsPayoutsModalOpen(true)}
            onSettingsClick={() => setIsSettingsModalOpen(true)}
          />
        </div>

        {/* Contest Status & Action (shown before tabs) */}
        {!primaryActionsLocked && (
          <div className="flex items-center justify-start gap-2 border-b border-t border-gray-200 py-3 px-4 mt-2">
            <button
              type="button"
              onClick={() => setIsLineupModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
            >
              Enter Contest
            </button>
            <span className="text-xs text-gray-400 font-display pr-1">0/1 Lineups Entered</span>
          </div>
        )}

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
                    : "text-gray-400 hover:border-gray-300 hover:text-gray-700",
                )
              }
            >
              Contest
            </Tab>
            {/* {primaryActionsLocked && (
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
            )} */}

            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-1.5 text-sm font-display leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-400 hover:border-gray-300 hover:text-gray-700",
                )
              }
            >
              Winner Pool
            </Tab>

            {contest.status === "SETTLED" && (
              <Tab
                className={({ selected }: { selected: boolean }) =>
                  classNames(
                    "w-full py-1.5 text-sm font-display leading-5",
                    "focus:outline-none",
                    selected
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-400 hover:border-gray-300 hover:text-gray-700",
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
                <TimelineModalContent contestId={contestId} />

                {/* Contest Entry List */}
                <div className="mt-3">
                  <ContestEntryList
                    contestLineups={contest?.contestLineups}
                    roundDisplay={contest?.tournament?.roundDisplay}
                    contestStatus={contest.status}
                    contestAddress={contest.address}
                    contestChainId={contest.chainId}
                    contest={contest}
                  />
                </div>
              </div>
            </TabPanel>

            {/* PLAYERS - Only shown when primary actions are locked */}
            {/* {primaryActionsLocked && (
              <TabPanel>
                <ContestPlayerList
                  contest={contest}
                  roundDisplay={contest?.tournament?.roundDisplay}
                />
              </TabPanel>
            )} */}

            {/*  Prediction Market Tab: PredictionPositionsList */}
            <TabPanel>
              <div className="p-2 mt-1">
                <TimelineModalContent contestId={contestId} />

                <div className="mt-3">
                  <PredictionLineupsList contest={contest} />
                </div>
              </div>
            </TabPanel>

            {/* RESULTS - Only shown when contest is settled */}
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

// NOTE: keep this svg comment for reference
{
  /* TIMELINE BUTTON */
}
{
  /* <button
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
              <line x1="2" y1="16" x2="18" y2="16" stroke="currentColor" strokeWidth="1.5" />
              <line x1="2" y1="4" x2="2" y2="16" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M 2 10 Q 4 6, 6 10 T 10 10 T 14 10 T 18 10"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-display text-gray-400">Timeline</span>
          </button> */
}
