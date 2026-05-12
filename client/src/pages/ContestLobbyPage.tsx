import React, { Fragment, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Tab,
  TabPanel,
  TabList,
  TabGroup,
  TabPanels,
  Transition,
  TransitionChild,
} from "@headlessui/react";
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

  const {
    data: primarySideBalance,
    isLoading: isPrimaryPoolLabelLoading,
    isError: isPrimaryPoolLabelError,
  } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getPrimarySideBalance",
    chainId: contest?.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: Boolean(contest?.address),
    },
  });

  const primaryPoolTabSuffix = (() => {
    if (!contest?.address) return "—";
    if (isPrimaryPoolLabelLoading) return "...";
    if (isPrimaryPoolLabelError) return "—";
    return Math.round(
      Number(formatUnits((primarySideBalance as bigint | undefined) ?? 0n, 18)),
    ).toLocaleString();
  })();

  const { data: secondarySideBalance } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getSecondarySideBalance",
    chainId: contest?.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: Boolean(contest?.address),
    },
  });
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
  const canOpenLineupModalForWinnerPool =
    canPredictOnChain && !secondaryActionsLockedForWinnerPool;

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
              Contest – {primaryPoolTabSuffix === "—" ? "—" : `$${primaryPoolTabSuffix}`}
            </Tab>
            {!isPostSettlement ? (
              <Tab className={({ selected }: { selected: boolean }) => getTabButtonClass(selected)}>
                Winner Pool - ${secondaryPoolLabel}
              </Tab>
            ) : null}
            {isPostSettlement ? (
              <Tab className={({ selected }: { selected: boolean }) => getTabButtonClass(selected)}>
                Results
              </Tab>
            ) : null}
          </TabList>

          <TabPanels>
            {/* ENTRIES (Contest) */}
            <TabPanel className="p-4 focus:outline-none">
              <div className="space-y-2">
                {primaryActionsLocked ? (
                  <ContestTimelinesSection timelineData={contest.timeline} variant="score" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 border-b border-gray-200 py-8">
                    <button
                      type="button"
                      onClick={() => setIsLineupModalOpen(true)}
                      className="w-full max-w-sm rounded-lg border border-blue-500 bg-blue-500 px-6 py-3 text-base font-display font-semibold text-white transition-colors hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <p className="text-xs text-gray-800 text-center">
                        <span>
                          <strong>{contest.tournament.name}</strong> starts in
                        </span>
                        <br />
                        <strong>
                          <span className="inline-block min-w-[120px] whitespace-nowrap tabular-nums pt-1">
                            <CountdownTimer targetDate={contest.tournament.startDate} />
                          </span>
                        </strong>
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

            {!isPostSettlement ? (
              <TabPanel className="p-4 focus:outline-none">
                <div className="space-y-4">
                  <ContestSharesPieChart contest={contest} />
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
            ) : null}
            {isPostSettlement ? (
              <TabPanel className="p-0 focus:outline-none">
                <ContestResultsPanel contest={contest} />
              </TabPanel>
            ) : null}
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
      <Transition appear show={isLineupModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsLineupModalOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-5">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-modal-wide transform overflow-hidden rounded-sm bg-white text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between p-3 pb-2 bg-gray-100">
                    <DialogTitle className="font-display text-xl font-semibold tracking-tight text-slate-800">
                      Manage Contest Lineups
                    </DialogTitle>
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
                  {user ? (
                    <LineupManagement
                      contest={contest}
                      onCloseModal={() => setIsLineupModalOpen(false)}
                    />
                  ) : (
                    <div className="p-4">
                      <Connect />
                    </div>
                  )}
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
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

  return (
    <Timeline timelineData={timelineData} defaultMetric="score" allowedMetrics={["score"]} />
  );
};
