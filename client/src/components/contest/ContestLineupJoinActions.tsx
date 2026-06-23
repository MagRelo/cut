import React, { Fragment } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import type { Contest } from "../../types/contest";
import { arePrimaryActionsLocked } from "../../types/contest";
import type { useContestLineupEntry } from "../../hooks/useContestLineupEntry";
import { CheckIcon } from "@heroicons/react/20/solid";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

const joinActionsFooterClassName = "border-t border-gray-200 bg-gray-50 px-3 py-2.5 font-display";

const EnteredInContestLabel = () => (
  <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700">
    <CheckIcon className="h-4 w-4 shrink-0" aria-hidden />
    Entered in this contest
  </div>
);

type ContestLineupEntry = ReturnType<typeof useContestLineupEntry>;

interface ContestLineupJoinActionsProps {
  contest: Contest;
  lineupId: string;
  entry: ContestLineupEntry;
}

export const ContestLineupJoinActions: React.FC<ContestLineupJoinActionsProps> = ({
  contest,
  lineupId,
  entry,
}) => {
  const isEntered = entry.enteredLineupsMap.has(lineupId);
  const isProcessing = entry.isLineupProcessing(lineupId);
  const canEnter = !arePrimaryActionsLocked(contest.status);

  if (!canEnter) {
    return isEntered ? (
      <div className={joinActionsFooterClassName}>
        <EnteredInContestLabel />
      </div>
    ) : null;
  }

  return (
    <>
      <div className={joinActionsFooterClassName}>
        {isEntered ? (
          <div className="space-y-2.5">
            <EnteredInContestLabel />
            <button
              type="button"
              onClick={() => void entry.handleLeaveContest(lineupId)}
              disabled={isProcessing}
              className="w-full rounded-lg border border-gray-400/50 bg-gray-200 px-4 py-2.5 font-display text-sm font-medium text-gray-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinnerSmall />
                  Confirming...
                </span>
              ) : (
                "Leave Contest"
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void entry.handleJoinContest(lineupId)}
            disabled={!entry.hasPlayers(lineupId) || isProcessing || entry.isPrimaryDepositLoading}
            className="w-full rounded-lg border border-blue-500 bg-blue-500 px-4 py-2.5 font-display text-sm font-semibold text-white shadow-md transition-colors hover:border-blue-600 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinnerSmall />
                Confirming...
              </span>
            ) : (
              `Enter Contest - ${entry.joinPrimaryDepositLabel}`
            )}
          </button>
        )}
      </div>

      <Transition appear show={Boolean(entry.warningMessage)} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={entry.clearWarningMessage}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
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
                <DialogPanel className="w-full max-w-md transform rounded-sm bg-white p-6 text-left shadow-xl">
                  <DialogTitle className="mb-2 text-lg font-semibold text-red-600">
                    Warning
                  </DialogTitle>
                  <p className="mb-4 font-display text-gray-800">{entry.warningMessage}</p>
                  <button
                    type="button"
                    onClick={entry.clearWarningMessage}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Close
                  </button>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
