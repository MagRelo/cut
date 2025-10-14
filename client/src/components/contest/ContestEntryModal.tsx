import React, { Fragment } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { PlayerDisplayCard } from "../player/PlayerDisplayCard";
import { type TournamentLineup } from "../../types/player";

interface ContestEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineup: TournamentLineup | null;
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
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                {/* Header Section */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <DialogTitle
                        as="h3"
                        className="text-2xl font-semibold leading-6 text-gray-900"
                      >
                        {userName}
                      </DialogTitle>
                      <p className="text-sm text-gray-500 mt-1 font-medium text-left">
                        {lineup.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close</span>
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Content Section */}
                <div className="px-4 sm:px-6 py-4 max-h-[70vh] overflow-y-auto bg-gray-50">
                  <div className="space-y-3">
                    {[...lineup.players]
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
                        <PlayerDisplayCard
                          key={player.id}
                          player={player}
                          roundDisplay={roundDisplay}
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
