import React, { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { type SecondaryPoolSnapshot } from "@cut/secondary-pricing";
import { PredictionEntryForm, type PredictionEntryData } from "./PredictionEntryForm";
import { type Contest } from "../../types/contest";

interface PredictionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest;
  entryId: string | null;
  entryData: PredictionEntryData[];
  secondaryPrizePoolFormatted: string;
  secondaryTotalFundsFormatted: string;
  poolSnapshot: SecondaryPoolSnapshot | undefined;
}

export const PredictionEntryModal: React.FC<PredictionEntryModalProps> = ({
  isOpen,
  onClose,
  contest,
  entryId,
  entryData,
  secondaryPrizePoolFormatted,
  secondaryTotalFundsFormatted,
  poolSnapshot,
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
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-md bg-gray-100 shadow-xl transition-all p-2">
                <div className="px-2 sm:px-6 py-4 max-h-[70vh] overflow-y-auto bg-white rounded-sm border border-gray-300">
                  <div className="min-h-[280px] pt-1">
                    <PredictionEntryForm
                      contest={contest}
                      entryId={entryId}
                      entryData={entryData}
                      secondaryPrizePoolFormatted={secondaryPrizePoolFormatted}
                      secondaryTotalFundsFormatted={secondaryTotalFundsFormatted}
                      poolSnapshot={poolSnapshot}
                      onClose={onClose}
                    />
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
