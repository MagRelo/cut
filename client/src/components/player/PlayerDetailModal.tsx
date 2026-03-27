import React, { Fragment, useEffect, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import { PlayerDisplayCard } from "./PlayerDisplayCard";
import { PlayerScorecard } from "./PlayerScorecard";
import type { PlayerWithTournamentData } from "../../types/player";

export interface PlayerLineupRef {
  userName: string;
  lineupName: string;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerWithTournamentData | null;
  roundDisplay: string;
  /** When non-empty, shows Scorecard + Lineups tabs (contest ownership view). */
  playerLineups?: PlayerLineupRef[];
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  isOpen,
  onClose,
  player,
  roundDisplay,
  playerLineups = [],
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const showLineupsTab = playerLineups.length > 0;

  useEffect(() => {
    if (isOpen) setTabIndex(0);
  }, [isOpen, player?.id]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-md bg-white text-left align-middle shadow-xl transition-all">
                <div className="bg-gray-100 p-2">
                  {player && showLineupsTab ? (
                    <div className="overflow-hidden border border-gray-300 rounded-sm">
                      <PlayerDisplayCard player={player} roundDisplay={roundDisplay} />

                      <TabGroup selectedIndex={tabIndex} onChange={setTabIndex}>
                        <TabList className="flex space-x-1 border-b border-gray-200 px-4 bg-white rounded-t-sm">
                          <Tab
                            className={({ selected }: { selected: boolean }) =>
                              classNames(
                                "w-full py-2 text-sm font-display leading-5",
                                "focus:outline-none",
                                selected
                                  ? "border-b-2 border-blue-600 text-blue-700"
                                  : "text-gray-400 hover:text-gray-800",
                              )
                            }
                          >
                            Scorecard
                          </Tab>
                          <Tab
                            className={({ selected }: { selected: boolean }) =>
                              classNames(
                                "w-full py-2 text-sm font-display leading-5",
                                "focus:outline-none",
                                selected
                                  ? "border-b-2 border-blue-600 text-blue-700"
                                  : "text-gray-400 hover:text-gray-800",
                              )
                            }
                          >
                            Lineups ({playerLineups.length})
                          </Tab>
                        </TabList>

                        <TabPanels>
                          <TabPanel>
                            <div className="h-[184px] overflow-y-auto bg-slate-50">
                              <PlayerScorecard player={player} roundDisplay={roundDisplay} />
                            </div>
                          </TabPanel>

                          <TabPanel>
                            <div className="h-[184px] overflow-y-auto bg-slate-50">
                              <div className="px-4 py-3 font-display">
                                <div className="space-y-1.5">
                                  {playerLineups.map((lineup, index) => (
                                    <div
                                      key={`${lineup.userName}-${lineup.lineupName}-${index}`}
                                      className="flex items-center justify-center gap-2 px-3 py-1 text-sm"
                                    >
                                      <span className="font-medium text-gray-900">{lineup.userName}</span>
                                      <span className="text-gray-600">•</span>
                                      <span className="text-gray-700">{lineup.lineupName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TabPanel>
                        </TabPanels>
                      </TabGroup>
                    </div>
                  ) : player ? (
                    <div className="overflow-hidden border border-gray-300 rounded-sm">
                      <PlayerDisplayCard player={player} roundDisplay={roundDisplay} />
                      <div className="h-[184px] overflow-y-auto bg-slate-50">
                        <PlayerScorecard player={player} roundDisplay={roundDisplay} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
