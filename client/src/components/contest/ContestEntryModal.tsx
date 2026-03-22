import React, { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
  Tab,
  TabGroup,
  TabList,
  TabPanels,
  TabPanel,
} from "@headlessui/react";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
import { EntryHeader } from "./EntryHeader";
import { type ContestLineup } from "../../types/lineup";
import { type SecondaryPoolSnapshot } from "@cut/secondary-pricing";
import { PredictionEntryForm, type PredictionEntryData } from "./PredictionEntryForm";
import { PredictionEntryPosition } from "./PredictionEntryPosition";
import { type Contest } from "../../types/contest";

interface ContestEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineup: ContestLineup | null;
  roundDisplay: string;
  userName?: string;
  contest: Contest;
  entryData: PredictionEntryData[];
  secondaryPrizePoolFormatted: string;
  secondaryTotalFundsFormatted: string;
  poolSnapshot: SecondaryPoolSnapshot | undefined;
  canWithdraw: boolean;
  /**
   * Which tab to show initially when opening.
   * Defaults to "players" to preserve existing behavior.
   */
  initialTab?: "players" | "buyShares" | "position";
}

export const ContestEntryModal: React.FC<ContestEntryModalProps> = ({
  isOpen,
  onClose,
  lineup,
  roundDisplay,
  userName,
  contest,
  entryData,
  secondaryPrizePoolFormatted,
  secondaryTotalFundsFormatted,
  poolSnapshot,
  canWithdraw,
  initialTab = "players",
}) => {
  // NOTE: Do not early-return before hooks.
  const lineupPlayers = lineup?.tournamentLineup?.players ?? [];

  // Calculate total points for the lineup
  const totalPoints = lineupPlayers.reduce((sum, player) => {
    return sum + (player.tournamentData?.total || 0);
  }, 0);

  const sortedPlayers = [...lineupPlayers].sort((a, b) => {
    const aTotal = a.tournamentData?.total || 0;
    const bTotal = b.tournamentData?.total || 0;
    return bTotal - aTotal;
  });

  const predictionEntry = lineup ? entryData.find((entry) => entry.entryId === lineup.entryId) : undefined;
  const hasPosition = Boolean(predictionEntry?.hasPosition);
  const hasPlayers = lineupPlayers.length > 0;

  const showBuySharesTab =
    contest.status !== "LOCKED" &&
    contest.status !== "SETTLED" &&
    contest.status !== "CANCELLED" &&
    contest.status !== "CLOSED";

  const buySharesTabIndex = showBuySharesTab ? (hasPlayers ? 1 : 0) : -1;
  const positionTabIndex = showBuySharesTab
    ? hasPlayers
      ? 2
      : 1
    : hasPlayers
      ? 1
      : 0;

  const getInitialTabIndex = () => {
    if (initialTab === "buyShares") {
      if (showBuySharesTab) return buySharesTabIndex;
      if (hasPlayers) return 0;
      if (hasPosition) return positionTabIndex;
      return 0;
    }
    if (initialTab === "position") {
      if (hasPosition) return positionTabIndex;
      if (showBuySharesTab) return buySharesTabIndex;
      return hasPlayers ? 0 : 0;
    }
    // initialTab === "players"
    if (hasPlayers) return 0;
    if (showBuySharesTab) return buySharesTabIndex;
    if (hasPosition) return positionTabIndex;
    return 0;
  };

  const [selectedIndex, setSelectedIndex] = useState<number>(() => getInitialTabIndex());

  // Reset tab when opening or when the lineup changes.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(getInitialTabIndex());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lineup?.id, initialTab, hasPlayers, hasPosition, showBuySharesTab, contest.status]);

  if (!lineup) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-sm  bg-gray-100 transition-all p-2">
                {/* Content Section */}
                <div className="px-2 sm:px-6 py-2 max-h-[70vh] overflow-y-auto bg-white rounded-sm border border-gray-300">
                  {/* Header */}
                  <div className="pr-3 pl-3 py-3 border-b border-slate-300 mb-2">
                    <EntryHeader
                      userName={userName}
                      lineupName={lineup.tournamentLineup?.name}
                      totalPoints={totalPoints || 0}
                      position={lineup.position}
                      isInTheMoney={lineup.position <= 1}
                    />
                  </div>

                  <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
                    <TabList className="mb-3 flex gap-2 border-b border-gray-200 px-2">
                      {hasPlayers && (
                        <Tab
                          className={({ selected }) =>
                            `flex-1 py-1.5 text-sm font-display leading-5 focus:outline-none border-b-2 transition-colors ${
                              selected
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
                            }`
                          }
                        >
                          Players
                        </Tab>
                      )}
                      {showBuySharesTab && (
                        <Tab
                          className={({ selected }) =>
                            `flex-1 py-1.5 text-sm font-display leading-5 focus:outline-none border-b-2 transition-colors ${
                              selected
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
                            }`
                          }
                        >
                          Buy Shares
                        </Tab>
                      )}
                      {hasPosition && (
                        <Tab
                          className={({ selected }) =>
                            `flex-1 py-1.5 text-sm font-display leading-5 focus:outline-none border-b-2 transition-colors ${
                              selected
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
                            }`
                          }
                        >
                          Position
                        </Tab>
                      )}
                    </TabList>
                    <TabPanels>
                      {hasPlayers && (
                        <TabPanel>
                          <div>
                            {sortedPlayers.map((player, index) => {
                              const leaderboardHref = player.pga_pgaTourId
                                ? `/leaderboard?${new URLSearchParams({
                                    pgaTourId: player.pga_pgaTourId,
                                  }).toString()}`
                                : "/leaderboard";

                              return (
                                <Fragment key={player.id}>
                                  <Link
                                    to={leaderboardHref}
                                    className="block text-inherit no-underline hover:opacity-90"
                                    onClick={onClose}
                                  >
                                    <PlayerDisplayRow
                                      player={player}
                                      roundDisplay={roundDisplay}
                                      showArrow={false}
                                    />
                                  </Link>
                                  {index < sortedPlayers.length - 1 && (
                                    <hr className="my-0 border-0 border-t border-gray-200" />
                                  )}
                                </Fragment>
                              );
                            })}
                          </div>
                        </TabPanel>
                      )}
                      {showBuySharesTab && (
                        <TabPanel>
                          <div className="pt-1">
                            <PredictionEntryForm
                              contest={contest}
                              entryId={lineup.entryId ?? null}
                              entryData={entryData}
                              secondaryPrizePoolFormatted={secondaryPrizePoolFormatted}
                              secondaryTotalFundsFormatted={secondaryTotalFundsFormatted}
                              poolSnapshot={poolSnapshot}
                              onClose={onClose}
                            />
                          </div>
                        </TabPanel>
                      )}
                      {hasPosition && predictionEntry && (
                        <TabPanel>
                          <div className="pt-1">
                            <PredictionEntryPosition
                              contest={contest}
                              entry={predictionEntry}
                              canWithdraw={canWithdraw}
                              userName={userName || lineup.user?.email || "Unknown User"}
                              lineupName={lineup.tournamentLineup?.name || "Lineup"}
                            />
                          </div>
                        </TabPanel>
                      )}
                    </TabPanels>
                  </TabGroup>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
