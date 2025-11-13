import React, { Fragment } from "react";
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
  canWithdraw: boolean;
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
  canWithdraw,
}) => {
  if (!lineup) return null;

  const lineupPlayers = lineup.tournamentLineup?.players ?? [];

  // Calculate total points for the lineup
  const totalPoints = lineupPlayers.reduce((sum, player) => {
    return (
      sum +
      (player.tournamentData?.total || 0) +
      (player.tournamentData?.cut || 0) +
      (player.tournamentData?.bonus || 0)
    );
  }, 0);

  const sortedPlayers = [...lineupPlayers].sort((a, b) => {
    const aTotal =
      (a.tournamentData?.total || 0) +
      (a.tournamentData?.cut || 0) +
      (a.tournamentData?.bonus || 0);
    const bTotal =
      (b.tournamentData?.total || 0) +
      (b.tournamentData?.cut || 0) +
      (b.tournamentData?.bonus || 0);
    return bTotal - aTotal;
  });

  const predictionEntry = entryData.find((entry) => entry.entryId === lineup.entryId);
  const hasPosition = Boolean(predictionEntry?.hasPosition);
  const hasPlayers = lineupPlayers.length > 0;

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

                  <TabGroup>
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
                      <Tab
                        className={({ selected }) =>
                          `flex-1 py-1.5 text-sm font-display leading-5 focus:outline-none border-b-2 transition-colors ${
                            selected
                              ? "border-blue-500 text-blue-600"
                              : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
                          }`
                        }
                      >
                        Bet To Win
                      </Tab>
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
                            {sortedPlayers.map((player) => (
                              <PlayerDisplayRow
                                key={player.id}
                                player={player}
                                roundDisplay={roundDisplay}
                                showArrow={false}
                              />
                            ))}
                          </div>
                        </TabPanel>
                      )}
                      <TabPanel>
                        <div className="pt-1">
                          <PredictionEntryForm
                            contest={contest}
                            entryId={lineup.entryId ?? null}
                            entryData={entryData}
                            secondaryPrizePoolFormatted={secondaryPrizePoolFormatted}
                            secondaryTotalFundsFormatted={secondaryTotalFundsFormatted}
                            onClose={onClose}
                          />
                        </div>
                      </TabPanel>
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
