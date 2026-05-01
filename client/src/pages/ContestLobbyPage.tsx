import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup, TabPanels } from "@headlessui/react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
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

const TAB_LIST_CLASS = "flex border-b border-gray-200 px-3";
const getTabButtonClass = (selected: boolean) =>
  classNames(
    "w-full border-b-2 py-2 text-sm font-display leading-5 focus:outline-none",
    selected
      ? "border-blue-500 text-blue-600"
      : "border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-700",
  );

export const ContestLobby: React.FC = () => {
  const { id: contestId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: contest, isLoading, error: queryError } = useContestQuery(contestId);

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
      <div className="space-y-3 p-4">
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
      <div className="space-y-3 p-4">
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
    return <div className="space-y-3 p-4 font-display">Contest not found</div>;
  }

  const isPostSettlement = contest.status === "SETTLED" || contest.status === "CLOSED";

  return (
    <div className="space-y-3 p-4">
      {/* contest lobby */}
      <div className="bg-white rounded-sm shadow border border-gray-200">
        {/* header */}

        <div className="px-3 py-4">
          <ContestCard
            contest={contest}
            onPotClick={() => setIsPayoutsModalOpen(true)}
            // onSettingsClick={() => setIsSettingsModalOpen(true)}
            onSettingsClick={undefined}
          />
        </div>

        {/* tabs */}
        <TabGroup
          selectedIndex={selectedIndex}
          onChange={setSelectedIndex}
          key={`${contest.id}-${isPostSettlement}`}
        >
          <TabList className={TAB_LIST_CLASS}>
            <Tab className={({ selected }: { selected: boolean }) => getTabButtonClass(selected)}>
              Contest – ${primaryPoolLabel}
            </Tab>
            {!isPostSettlement ? (
              <Tab className={({ selected }: { selected: boolean }) => getTabButtonClass(selected)}>
                Winner Pool - ${secondaryPoolLabel}
              </Tab>
            ) : (
              <Tab className={({ selected }: { selected: boolean }) => getTabButtonClass(selected)}>
                Results
              </Tab>
            )}
          </TabList>

          <TabPanels>
            {/* ENTRIES (Contest) */}
            <TabPanel className="p-4 focus:outline-none">
              <div className="space-y-4">
                {primaryActionsLocked ? (
                  <ContestTimelinesSection timelineData={contest.timeline} variant="score" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 border-b border-gray-200 py-4">
                    <button
                      type="button"
                      onClick={() => setIsLineupModalOpen(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded border border-blue-500 transition-colors text-sm font-display"
                    >
                      Enter Contest{" — "}
                      <span>
                        {contest.settings?.primaryDeposit === 0
                          ? "Free"
                          : `$${contest.settings?.primaryDeposit ?? 0}`}
                      </span>
                    </button>

                    {contest.tournament?.status === "NOT_STARTED" &&
                    contest.tournament.startDate ? (
                      <p className="text-xs text-gray-500 text-center mb-2 mt-2">
                        <span>
                          <strong>{contest.tournament.name}</strong> starts in
                        </span>
                        <br />
                        <span className="inline-block min-w-[120px] whitespace-nowrap tabular-nums pt-1">
                          <CountdownTimer targetDate={contest.tournament.startDate} />
                        </span>
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Contest Entry List */}
                <ContestEntryList
                  contestLineups={contest?.contestLineups}
                  roundDisplay={contest?.tournament?.roundDisplay}
                  contestStatus={contest.status}
                />
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

            {!isPostSettlement ? (
              /* Prediction Market (Winner Pool tab) */
              <TabPanel className="p-4 focus:outline-none">
                <div className="space-y-4">
                  <ContestSharesPieChart contest={contest} />
                  {/* <ContestTimelinesSection timelineData={contest.timeline} variant="sharePrice" /> */}

                  <TabGroup>
                    <TabList className={TAB_LIST_CLASS}>
                      <Tab
                        className={({ selected }: { selected: boolean }) =>
                          getTabButtonClass(selected)
                        }
                      >
                        {!canOpenLineupModalForWinnerPool ? <span> 🔒</span> : null} Place Wager
                      </Tab>
                      <Tab
                        className={({ selected }: { selected: boolean }) =>
                          getTabButtonClass(selected)
                        }
                      >
                        Bets
                      </Tab>
                    </TabList>
                    <TabPanels className="pt-4">
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
            ) : (
              <TabPanel className="p-4 focus:outline-none">
                <div>
                  <ContestResultsPanel contest={contest} />
                </div>
              </TabPanel>
            )}
          </TabPanels>
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
        {user ? (
          <LineupManagement contest={contest} onCloseModal={() => setIsLineupModalOpen(false)} />
        ) : (
          <Connect />
        )}
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
