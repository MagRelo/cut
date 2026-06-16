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
  onOpenLineupsTab?: () => void;
}

export const ContestLineupModal: React.FC<ContestLineupModalProps> = ({
  contest,
  isOpen,
  onClose,
  isAuthenticated,
  onOpenLineupsTab,
}) => {
  const handleOpenLineupsTab = () => {
    onClose();
    onOpenLineupsTab?.();
  };

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
                  <LineupManagement
                    contest={contest}
                    onCloseModal={onClose}
                    onOpenLineupsTab={handleOpenLineupsTab}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="font-display text-sm text-gray-600">
                        <b>Sign In</b> to join contest
                      </p>
                    </div>
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
