import React, { Fragment } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
import { EntryHeader } from "./EntryHeader";
import { type ContestLineup } from "../../types/lineup";

interface ContestEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineup: ContestLineup | null;
  roundDisplay: string;
  userName?: string;
}

export const ContestEntryModal: React.FC<ContestEntryModalProps> = ({
  isOpen,
  onClose,
  lineup,
  roundDisplay,
  userName,
}) => {
  if (!lineup) return null;

  // Calculate total points for the lineup
  const totalPoints = lineup.tournamentLineup?.players.reduce((sum, player) => {
    return (
      sum +
      (player.tournamentData?.total || 0) +
      (player.tournamentData?.cut || 0) +
      (player.tournamentData?.bonus || 0)
    );
  }, 0);

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

                  <div className="space-y-2">
                    {[...(lineup.tournamentLineup?.players || [])]
                      .sort((a, b) => {
                        const aTotal =
                          (a.tournamentData?.total || 0) +
                          (a.tournamentData?.cut || 0) +
                          (a.tournamentData?.bonus || 0);
                        const bTotal =
                          (b.tournamentData?.total || 0) +
                          (b.tournamentData?.cut || 0) +
                          (b.tournamentData?.bonus || 0);
                        return bTotal - aTotal;
                      })
                      .map((player) => (
                        <PlayerDisplayRow
                          key={player.id}
                          player={player}
                          roundDisplay={roundDisplay}
                          showArrow={false}
                        />
                      ))}
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
