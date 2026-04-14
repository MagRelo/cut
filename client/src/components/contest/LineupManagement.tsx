import React, { Fragment, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { formatUnits, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";

import { Contest } from "src/types/contest";
import { useLineupData } from "../../hooks/useLineupData";
import { useAuth } from "../../contexts/AuthContext";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useJoinContest, useLeaveContest } from "../../hooks/useContestMutations";
import {
  useJoinContest as useJoinContestBlockchain,
  useLeaveContest as useLeaveContestBlockchain,
} from "../../hooks/useContestantOperations";
import { generateEntryId } from "../../utils/entryIdUtils";

// Import contract ABIs
import ContestContract from "../../utils/contracts/ContestController.json";

interface LineupManagementProps {
  contest: Contest;
  /** Called after a successful join when all user lineups are entered. */
  onCloseModal?: () => void;
}

// Helper function to get status messages
const getStatusMessages = (
  defaultMessage: string = "idle",
  isUserWaiting: boolean = false,
  isBlockchainWaiting: boolean = false,
): string => {
  if (isUserWaiting) {
    return "User confirmation...";
  }

  if (isBlockchainWaiting) {
    return "Network confirmation...";
  }

  return defaultMessage;
};

// Helper functions for decimal conversion (kept for balance checking logic)
const PAYMENT_TOKEN_DECIMALS = 6;
const PLATFORM_TOKEN_DECIMALS = 18;

const convertPaymentToPlatformTokens = (paymentTokenAmount: bigint): bigint => {
  const humanReadableAmount = formatUnits(paymentTokenAmount, PAYMENT_TOKEN_DECIMALS);
  return parseUnits(humanReadableAmount, PLATFORM_TOKEN_DECIMALS);
};

export const LineupManagement: React.FC<LineupManagementProps> = ({ contest, onCloseModal }) => {
  const { lineups } = useLineupData();
  const { user, platformTokenBalance, paymentTokenBalance } = useAuth();
  const joinContest = useJoinContest();
  const leaveContest = useLeaveContest();

  const [serverError, setServerError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "join" | "leave";
    lineupId: string;
    entryId?: string;
  } | null>(null);

  // Extract primitive values to prevent re-renders
  const contestId = contest.id;

  const userContestLineups = useMemo(() => {
    return contest?.contestLineups?.filter((lineup) => lineup.userId === user?.id) || [];
  }, [contest?.contestLineups, user?.id]);

  const enteredLineupsMap = useMemo(() => {
    const map = new Map<string, string>();
    userContestLineups.forEach((cl) => {
      map.set(cl.tournamentLineupId, cl.id);
    });
    return map;
  }, [userContestLineups]);

  // Use Contest blockchain hooks
  const {
    execute: executeJoinBlockchain,
    // isProcessing: isJoinProcessing,
    isSending: isJoinSending,
    isConfirming: isJoinConfirming,
    isFailed: isJoinFailed,
    error: joinError,
    createJoinContestCalls,
  } = useJoinContestBlockchain({
    onSuccess: async () => {
      if (pendingAction?.type === "join" && pendingAction?.lineupId && pendingAction?.entryId) {
        const joinedLineupId = pendingAction.lineupId;
        try {
          await joinContest.mutateAsync({
            contestId,
            tournamentLineupId: joinedLineupId,
            entryId: pendingAction.entryId,
          });
          setPendingAction(null);
          setServerError(null);

          const allLineupsEntered = lineups.every(
            (l) => enteredLineupsMap.has(l.id) || l.id === joinedLineupId,
          );
          if (allLineupsEntered) {
            onCloseModal?.();
          }
        } catch (error) {
          console.error("Error joining contest:", error);
          setServerError(
            `Failed to join contest: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          setPendingAction(null);
        }
      }
    },
    onError: () => {
      setServerError("Blockchain transaction failed. Please try again.");
      setPendingAction(null);
    },
  });

  const {
    execute: executeLeaveBlockchain,
    // isProcessing: isLeaveProcessing,
    isSending: isLeaveSending,
    isConfirming: isLeaveConfirming,
    isFailed: isLeaveFailed,
    error: leaveError,
    createLeaveContestCalls,
  } = useLeaveContestBlockchain({
    onSuccess: async () => {
      if (pendingAction?.type === "leave" && pendingAction?.lineupId) {
        try {
          const contestLineupId = enteredLineupsMap.get(pendingAction.lineupId);
          if (contestLineupId) {
            await leaveContest.mutateAsync({
              contestId,
              contestLineupId,
            });
          }
          setPendingAction(null);
          setServerError(null);
        } catch (error) {
          console.error("Error leaving contest:", error);
          setServerError(
            `Failed to leave contest: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          setPendingAction(null);
        }
      }
    },
    onError: () => {
      setServerError("Blockchain transaction failed. Please try again.");
      setPendingAction(null);
    },
  });

  // Combined processing states
  const isSending = isJoinSending || isLeaveSending;
  const isConfirming = isJoinConfirming || isLeaveConfirming;
  const isFailed = isJoinFailed || isLeaveFailed;
  const transactionError = joinError || leaveError;

  // On-chain primary stake; `0n` means free Layer 1 (must not use falsy checks — `0n` is falsy in JS).
  const {
    data: contestantDepositAmount,
    isPending: isPrimaryDepositLoading,
    isError: isPrimaryDepositError,
  } = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryDepositAmount",
    args: [],
  });

  // Modals
  const [warningModal, setWarningModal] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  // Helper: check if user has enough balance (0 primary deposit always passes)
  const hasEnoughBalance = useMemo(() => {
    if (contestantDepositAmount === undefined) return false;
    if (contestantDepositAmount === 0n) return true;

    const platformTokenAmount = platformTokenBalance ?? 0n;
    const paymentTokenAmount = paymentTokenBalance ?? 0n;
    const paymentTokenAsPlatformTokens = convertPaymentToPlatformTokens(paymentTokenAmount);
    const totalAvailableBalance = platformTokenAmount + paymentTokenAsPlatformTokens;

    return totalAvailableBalance >= contestantDepositAmount;
  }, [platformTokenBalance, paymentTokenBalance, contestantDepositAmount]);

  // Helper function to check if lineup with same players already exists in contest
  const checkForDuplicateInContest = useCallback(
    (lineupId: string): boolean => {
      const lineup = lineups.find((l) => l.id === lineupId);
      if (!lineup) return false;

      const normalizedPlayerIds = lineup.players
        .map((p) => p.id)
        .sort()
        .join(",");

      return (
        contest.contestLineups?.some((contestLineup) => {
          if (contestLineup.userId !== user?.id) return false;

          const contestTournamentLineup = lineups.find(
            (l) => l.id === contestLineup.tournamentLineupId,
          );
          if (!contestTournamentLineup) return false;

          const contestPlayerIds = contestTournamentLineup.players
            .map((p) => p.id)
            .sort()
            .join(",");
          return contestPlayerIds === normalizedPlayerIds;
        }) || false
      );
    },
    [lineups, contest.contestLineups, user?.id],
  );

  const handleJoinContest = async (lineupId: string) => {
    // Find the lineup being added
    const lineup = lineups.find((l) => l.id === lineupId);

    // Validate lineup has at least 1 player
    if (!lineup || lineup.players.length === 0) {
      setValidationError("Lineup must have at least 1 player");
      return;
    }

    // Check for duplicate player set in contest
    if (checkForDuplicateInContest(lineupId)) {
      setValidationError("You've already submitted a lineup with these players to this contest");
      return;
    }

    // Clear validation error if checks pass
    setValidationError(null);

    if (isPrimaryDepositLoading) {
      return;
    }
    if (isPrimaryDepositError || contestantDepositAmount === undefined) {
      setSubmissionError("Unable to read contest details from blockchain");
      return;
    }

    if (!hasEnoughBalance) {
      setWarningModal({
        open: true,
        message: `You do not have enough funds to join this contest.`,
      });
      return;
    }

    // Generate deterministic entryId
    const entryId = generateEntryId(contest.address, lineupId);

    setPendingAction({ type: "join", lineupId, entryId: entryId.toString() });
    setSubmissionError(null);

    const platformTokenAmount = platformTokenBalance ?? 0n;
    const paymentTokenAmount = paymentTokenBalance ?? 0n;

    // Create and execute the join contest calls
    const calls = createJoinContestCalls(
      contest.address as string,
      entryId,
      contestantDepositAmount,
      platformTokenAmount,
      paymentTokenAmount,
    );

    await executeJoinBlockchain(calls);
  };

  const handleLeaveContest = async (lineupId: string) => {
    setSubmissionError(null);

    const contestLineup = contest.contestLineups?.find(
      (cl) => cl.tournamentLineupId === lineupId && cl.userId === user?.id,
    );

    if (!contestLineup?.entryId) {
      setSubmissionError("Entry ID not found. Cannot leave contest.");
      return;
    }

    setPendingAction({ type: "leave", lineupId });

    const calls = createLeaveContestCalls(contest.address as string, Number(contestLineup.entryId));

    await executeLeaveBlockchain(calls);
  };

  const joinPrimaryDepositLabel =
    contest.settings?.primaryDeposit === 0
      ? "Free"
      : `$${contest.settings?.primaryDeposit ?? 0}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Warning Modal */}
      <Transition appear show={warningModal.open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setWarningModal({ open: false, message: "" })}
        >
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
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-md transform rounded-md bg-white text-left align-middle shadow-xl transition-all">
                  <div className="p-6">
                    <DialogTitle className="text-lg font-semibold text-red-600 mb-2">
                      Warning
                    </DialogTitle>
                    <div className="text-gray-800 mb-4 font-display">{warningModal.message}</div>
                    <button
                      type="button"
                      onClick={() => setWarningModal({ open: false, message: "" })}
                      className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                      Close
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <h3 className="text-sm font-medium text-gray-900">My Lineups</h3>

      {lineups.map((lineup) => {
        const isEntered = enteredLineupsMap.has(lineup.id);
        const isPending = pendingAction?.lineupId === lineup.id;
        const isProcessing = isPending && (isSending || isConfirming);

        return (
          <div
            key={lineup.id}
            className={`border rounded-sm p-3 ${
              isEntered ? "border-gray-300 bg-gray-50" : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">
                    {lineup.name || `Lineup ${lineup.id.slice(-6)}`}
                  </h4>
                  {isEntered && (
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs font-medium text-green-600">Lineup Entered</span>
                    </div>
                  )}
                </div>
                {lineup.players && lineup.players.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600 mt-2">
                    {lineup.players.map((player) => (
                      <div key={player.id}>
                        {player.pga_displayName || `${player.pga_firstName} ${player.pga_lastName}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3">
              {isEntered ? (
                <button
                  onClick={() => handleLeaveContest(lineup.id)}
                  disabled={isProcessing}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2 justify-center">
                      <LoadingSpinnerSmall />
                      {getStatusMessages("idle", isSending, isConfirming)}
                    </div>
                  ) : (
                    "Leave Contest"
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleJoinContest(lineup.id)}
                  disabled={isProcessing || isPrimaryDepositLoading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2 justify-center">
                      <LoadingSpinnerSmall />
                      {getStatusMessages("idle", isSending, isConfirming)}
                    </div>
                  ) : (
                    `Join Contest — ${joinPrimaryDepositLabel}`
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {lineups.length === 0 && (
        <Link
          to="/lineups/create"
          className="w-full block text-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded border border-blue-500 transition-colors text-sm font-display"
        >
          Add Lineup
        </Link>
      )}

      {/* Error Display */}
      {(validationError || submissionError || serverError || transactionError || isFailed) && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {validationError ||
            submissionError ||
            serverError ||
            transactionError ||
            "The transaction was rejected or failed to execute. Please try again."}
        </div>
      )}
    </div>
  );
};
