import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup, TabPanels } from "@headlessui/react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Breadcrumbs } from "../components/common/Breadcrumbs.tsx";
import { ContestCard } from "../components/contest/ContestCard";
import { useContestQuery } from "../hooks/useContestQuery";
import { LineupManagement } from "../components/contest/LineupManagement";
import { ContestEntryList } from "../components/contest/ContestEntryList";
import { ContestSettings } from "../components/contest/ContestSettings";
import { Connect } from "../components/user/Connect";
import { arePrimaryActionsLocked, areSecondaryActionsLocked } from "../types/contest";
import { ContestResultsPanel } from "../components/contest/ContestResultsPanel";
import { Timeline } from "../components/contest/Timeline";
import { type TimelineData } from "../types/contest";
import { Modal } from "../components/common/Modal";
import { ContestPayoutsModal } from "../components/contest/ContestPayoutsModal";
import { ContestSharesPieChart } from "../components/contest/ContestSharesPieChart";
import { PredictionLineupsList } from "../components/contest/PredictionLineupsList";
import { PredictionPositionsList } from "../components/contest/PredictionPositionsList";
import { ContestState } from "../hooks/useContestPredictionData";
import { CountdownTimer } from "../components/tournament/CountdownTimer";
import ContestContract from "../utils/contracts/ContestController.json";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const ContestLobby: React.FC = () => {
  const { id: contestId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const {
    data: contest,
    isLoading,
    error: queryError,
    refetch: refetchContest,
  } = useContestQuery(contestId);

  // Compute action locks based on contest status
  const primaryActionsLocked = contest ? arePrimaryActionsLocked(contest.status) : true;

  const { data: primarySideBalance } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getPrimarySideBalance",
    chainId: contest?.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: Boolean(contest?.address),
    },
  });

  const { data: secondarySideBalance } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getSecondarySideBalance",
    chainId: contest?.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: Boolean(contest?.address),
    },
  });

  const primaryPoolLabel = Math.round(
    Number(formatUnits((primarySideBalance as bigint | undefined) ?? 0n, 18)),
  ).toLocaleString();
  const secondaryPoolLabel = Math.round(
    Number(formatUnits((secondarySideBalance as bigint | undefined) ?? 0n, 18)),
  ).toLocaleString();

  const { data: contestStateOnChain } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "state",
    chainId: contest?.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: Boolean(contest?.address),
    },
  });

  const secondaryActionsLockedForWinnerPool = contest
    ? areSecondaryActionsLocked(contest.status)
    : true;
  const canPredictOnChain =
    contestStateOnChain === ContestState.OPEN || contestStateOnChain === ContestState.ACTIVE;
  const canOpenLineupModalForWinnerPool = canPredictOnChain && !secondaryActionsLockedForWinnerPool;

  // tabs - default to first tab (Contest)
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
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
            // onSettingsClick={() => setIsSettingsModalOpen(true)}
            onSettingsClick={undefined}
          />
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
                    : "text-gray-400 hover:border-gray-300 hover:text-gray-700",
                )
              }
            >
              Contest – ${primaryPoolLabel}
            </Tab>
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
              Winner Pool - ${secondaryPoolLabel}
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
              <div className="p-2">
                {primaryActionsLocked ? (
                  <ContestTimelinesSection timelineData={contest.timeline} variant="score" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 border-gray-20 mt-6 mb-8">
                    <button
                      type="button"
                      onClick={() => setIsLineupModalOpen(true)}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    >
                      Enter Contest{" - "}
                      <span>${contest.settings?.primaryDeposit}</span>
                    </button>

                    {contest.tournament?.status === "NOT_STARTED" &&
                    contest.tournament.startDate ? (
                      <p className="text-xs text-gray-500 text-center mb-2">
                        <span>{contest.tournament.name} starts in</span>
                        <br />
                        <span className="inline-block min-w-[120px] whitespace-nowrap tabular-nums pt-1">
                          <CountdownTimer targetDate={contest.tournament.startDate} />
                        </span>
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Contest Entry List */}
                <div className="mt-2">
                  <ContestEntryList
                    contestLineups={contest?.contestLineups}
                    roundDisplay={contest?.tournament?.roundDisplay}
                    contestStatus={contest.status}
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
              <div className="p-2">
                <ContestSharesPieChart contest={contest} />
                {/* <ContestTimelinesSection timelineData={contest.timeline} variant="sharePrice" /> */}

                <TabGroup>
                  <TabList className="flex space-x-1 border-b border-gray-200 px-4">
                    <Tab
                      className={({ selected }: { selected: boolean }) =>
                        classNames(
                          "w-full py-1.5 text-sm font-display leading-5",
                          "focus:outline-none",
                          selected
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "border-b-2 border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-700",
                        )
                      }
                    >
                      {!canOpenLineupModalForWinnerPool ? <span> 🔒</span> : null} Buy Shares
                    </Tab>
                    <Tab
                      className={({ selected }: { selected: boolean }) =>
                        classNames(
                          "w-full py-1.5 text-sm font-display leading-5",
                          "focus:outline-none",
                          selected
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "border-b-2 border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-700",
                        )
                      }
                    >
                      Positions
                    </Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel className="focus:outline-none">
                      <PredictionLineupsList contest={contest} />
                    </TabPanel>
                    <TabPanel className="focus:outline-none">
                      <PredictionPositionsList contest={contest} />
                    </TabPanel>
                  </TabPanels>
                </TabGroup>
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

type ContestTimelinesVariant = "score" | "sharePrice";

const ContestTimelinesSection: React.FC<{
  timelineData: TimelineData | undefined;
  variant: ContestTimelinesVariant;
}> = ({ timelineData, variant }) => {
  if (!timelineData || !timelineData.teams || timelineData.teams.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: "300px" }}>
        <div className="text-gray-500 font-display">No timeline data available</div>
      </div>
    );
  }

  if (variant === "sharePrice") {
    return (
      <Timeline
        timelineData={timelineData}
        defaultMetric="sharePrice"
        allowedMetrics={["sharePrice"]}
      />
    );
  }

  return <Timeline timelineData={timelineData} defaultMetric="score" allowedMetrics={["score"]} />;
};
