import React, { Fragment } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild, DialogTitle } from "@headlessui/react";
import { type Contest } from "../../types/contest";
import { PredictionEntryForm, type PredictionEntryData } from "./PredictionEntryForm";

interface PredictionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest;
  entryId: string | null;
  entryData: PredictionEntryData[];
  secondaryPrizePoolFormatted: string;
  secondaryTotalFundsFormatted: string;
}

export const PredictionEntryModal: React.FC<PredictionEntryModalProps> = ({
  isOpen,
  onClose,
  contest,
  entryId,
  entryData,
  secondaryPrizePoolFormatted,
  secondaryTotalFundsFormatted,
}) => {
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
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-700 to-purple-800 px-6 py-4 text-white">
                  <DialogTitle as="h3" className="text-lg font-semibold font-display">
                    Buy Shares
                  </DialogTitle>
                </div>

                <div className="p-6">
                  <PredictionEntryForm
                    contest={contest}
                    entryId={entryId}
                    entryData={entryData}
                    secondaryPrizePoolFormatted={secondaryPrizePoolFormatted}
                    secondaryTotalFundsFormatted={secondaryTotalFundsFormatted}
                    onClose={onClose}
                  />
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
