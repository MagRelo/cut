import React, { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { type SecondaryPoolSnapshot } from "@cut/secondary-pricing";
import { PredictionEntryForm, type PredictionEntryData } from "./PredictionEntryForm";
import { type Contest } from "../../types/contest";

/** Matches `leave="ease-in duration-150"` + small buffer so the form keeps a valid entry during exit. */
const CLEAR_DISPLAY_ENTRY_ID_MS = 200;

interface PredictionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest;
  entryId: string | null;
  entryData: PredictionEntryData[];
  secondaryPrizePoolFormatted: string;
  secondaryTotalFundsFormatted: string;
  /** Sum of `secondaryLiquidityPerEntry` over entries (`totalSecondaryLiquidity()`), before this purchase. */
  totalSecondaryLiquidityBefore: bigint | undefined;
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
  totalSecondaryLiquidityBefore,
  poolSnapshot,
}) => {
  const [displayEntryId, setDisplayEntryId] = useState<string | null>(entryId);
  const clearDisplayEntryIdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (entryId) setDisplayEntryId(entryId);
  }, [entryId]);

  useEffect(() => {
    if (!isOpen) {
      if (clearDisplayEntryIdTimeoutRef.current != null) {
        clearTimeout(clearDisplayEntryIdTimeoutRef.current);
      }
      clearDisplayEntryIdTimeoutRef.current = setTimeout(() => {
        setDisplayEntryId(null);
        clearDisplayEntryIdTimeoutRef.current = null;
      }, CLEAR_DISPLAY_ENTRY_ID_MS);
    } else {
      if (clearDisplayEntryIdTimeoutRef.current != null) {
        clearTimeout(clearDisplayEntryIdTimeoutRef.current);
        clearDisplayEntryIdTimeoutRef.current = null;
      }
    }
    return () => {
      if (clearDisplayEntryIdTimeoutRef.current != null) {
        clearTimeout(clearDisplayEntryIdTimeoutRef.current);
        clearDisplayEntryIdTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

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
          <div className="flex min-h-full items-center justify-center p-4 text-left">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-md bg-gray-100 text-left align-middle shadow-xl transition-all p-2">
                <div className="flex max-h-[70vh] flex-col overflow-hidden bg-white rounded-sm border border-gray-300">
                  <div className="shrink-0 px-3 pt-3 sm:px-6 sm:pt-4">
                    <DialogTitle className="text-lg font-medium text-gray-900">
                      Buy Shares
                    </DialogTitle>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 sm:px-6">
                    <div className="min-h-[280px] pt-1">
                      <PredictionEntryForm
                        contest={contest}
                        entryId={displayEntryId}
                        entryData={entryData}
                        secondaryPrizePoolFormatted={secondaryPrizePoolFormatted}
                        secondaryTotalFundsFormatted={secondaryTotalFundsFormatted}
                        totalSecondaryLiquidityBefore={totalSecondaryLiquidityBefore}
                        poolSnapshot={poolSnapshot}
                        onClose={onClose}
                      />
                    </div>
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
