import React, { Fragment } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import type { Contest } from "../../types/contest";
import { canAddPrimaryPosition, canRemovePrimaryPosition } from "../../types/contest";
import { effectiveContestStatus } from "../../lib/lineupEditable";
import type { useContestLineupEntry } from "../../hooks/useContestLineupEntry";
import { CheckIcon } from "@heroicons/react/24/outline";
import { Button } from "../common/Button";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { TxButton } from "../common/TxButton";
import type { TxPhase } from "../../lib/txPhase";

const joinActionsFooterClassName = "border-t border-gray-200 bg-slate-50 px-3 py-2.5 font-display";

const statusBarClassName =
  "flex w-full items-center justify-center gap-1.5 py-1 text-sm font-semibold text-slate-900";

const leaveButtonClassName =
  "inline-flex h-10 w-full items-center justify-center rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50";

const EnteredInContestLabel = () => (
  <div role="status" className={statusBarClassName}>
    <CheckIcon className="h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
    Entered in this contest
  </div>
);

export interface ContestLineupJoinFooterProps {
  entered: boolean;
  canJoin: boolean;
  canLeave: boolean;
  isProcessing: boolean;
  hasPlayers: boolean;
  depositLoading: boolean;
  /** Shown after "Enter Contest - ", e.g. "$10" or "Free". */
  depositLabel: string;
  onJoin: () => void;
  onLeave: () => void;
  /** Paid chain phase for this lineup. `$0` stays `idle` and uses `isProcessing`. */
  phase?: TxPhase;
  txError?: string | null;
  onRetry?: () => void;
}

/** Entered / not-entered strip at the bottom of a lineup card. */
export const ContestLineupJoinFooter: React.FC<ContestLineupJoinFooterProps> = ({
  entered,
  canJoin,
  canLeave,
  isProcessing,
  hasPlayers,
  depositLoading,
  depositLabel,
  onJoin,
  onLeave,
  phase = "idle",
  txError,
  onRetry,
}) => {
  if (!entered && !canJoin) {
    return null;
  }

  const onChain = phase !== "idle";
  const onJoinClick = () => {
    if (phase === "recordFailed") onRetry?.();
    else onJoin();
  };
  const onLeaveClick = () => {
    if (phase === "recordFailed") onRetry?.();
    else onLeave();
  };

  if (entered) {
    return (
      <div className={joinActionsFooterClassName}>
        <div className="mt-1 space-y-2.5">
          <EnteredInContestLabel />
          {canLeave ? (
            onChain ? (
              <TxButton
                phase={phase}
                idleLabel="Leave Contest"
                onClick={onLeaveClick}
                error={txError}
                className={leaveButtonClassName}
                spinnerColor="gray"
              />
            ) : (
              <button
                type="button"
                onClick={onLeave}
                disabled={isProcessing}
                className={leaveButtonClassName}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinnerSmall color="gray" />
                    Confirming...
                  </span>
                ) : (
                  "Leave Contest"
                )}
              </button>
            )
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={joinActionsFooterClassName}>
      {onChain ? (
        <TxButton
          phase={phase}
          idleLabel={`Enter Contest - ${depositLabel}`}
          onClick={onJoinClick}
          disabled={phase === "recordFailed" ? false : !hasPlayers || depositLoading}
          error={txError}
          block
        />
      ) : (
        <Button
          type="button"
          block
          onClick={onJoin}
          disabled={!hasPlayers || isProcessing || depositLoading}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinnerSmall />
              Confirming...
            </span>
          ) : (
            `Enter Contest - ${depositLabel}`
          )}
        </Button>
      )}
    </div>
  );
};

type ContestLineupEntry = ReturnType<typeof useContestLineupEntry>;

interface ContestLineupJoinActionsProps {
  contest: Contest;
  lineupId: string;
  entry: ContestLineupEntry;
  /** ContestController.state(); preferred over DB status. */
  contestStateOnChain?: number;
}

export const ContestLineupJoinActions: React.FC<ContestLineupJoinActionsProps> = ({
  contest,
  lineupId,
  entry,
  contestStateOnChain,
}) => {
  const isEntered = entry.enteredLineupsMap.has(lineupId);
  const isProcessing = entry.isLineupProcessing(lineupId);
  const status = effectiveContestStatus(contest.status, contestStateOnChain);
  const canJoin = canAddPrimaryPosition(status);
  const canLeave = canRemovePrimaryPosition(status);

  const footer = (
    <ContestLineupJoinFooter
      entered={isEntered}
      canJoin={canJoin}
      canLeave={canLeave}
      isProcessing={isProcessing}
      hasPlayers={entry.hasPlayers(lineupId)}
      depositLoading={entry.isPrimaryDepositLoading}
      depositLabel={entry.joinPrimaryDepositLabel}
      onJoin={() => void entry.handleJoinContest(lineupId)}
      onLeave={() => void entry.handleLeaveContest(lineupId)}
      phase={entry.lineupPhase(lineupId)}
      txError={entry.lineupTxError(lineupId)}
      onRetry={() => entry.retryLineupSave(lineupId)}
    />
  );

  if (!isEntered && !canJoin) {
    return null;
  }

  return (
    <>
      {footer}

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
                  <Button type="button" onClick={entry.clearWarningMessage}>
                    Close
                  </Button>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
