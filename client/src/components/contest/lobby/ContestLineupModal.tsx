import React, { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { type Contest } from "../../../types/contest";
import { Connect } from "../../user/Connect";
import { LineupManagement } from "../LineupManagement";

export interface ContestLineupModalProps {
  contest: Contest;
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

export const ContestLineupModal: React.FC<ContestLineupModalProps> = ({
  contest,
  isOpen,
  onClose,
  isAuthenticated,
}) => {
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
                <div className="flex items-center justify-between bg-gray-100 p-3 pb-2">
                  <DialogTitle className="font-display text-xl font-semibold tracking-tight text-slate-800">
                    Manage Contest Lineups
                  </DialogTitle>
                  <button
                    type="button"
                    className="rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={onClose}
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
                {isAuthenticated ? (
                  <LineupManagement contest={contest} onCloseModal={onClose} />
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
  );
};
