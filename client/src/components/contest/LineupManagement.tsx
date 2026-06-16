import React, { Fragment, useState, useMemo, useCallback } from "react";
import { usePostHog } from "posthog-js/react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";

import { Contest } from "src/types/contest";
import { useLineupData } from "../../hooks/useLineupData";
import { useEventCandidatesQuery } from "../../hooks/useSportData";
import { useContestEvent } from "../../hooks/useContestEvent";
import {
  candidatesForPlatformLineup,
  platformLineupParticipantIds,
  platformLineupPrediction,
} from "../../lib/lineupUtils";
import { candidatesByParticipantIdMap } from "../../lib/candidateUtils";
import { sortCandidatesByLeaderboard } from "../../lib/candidateSorting";
import { SportParticipantRow } from "../platform/SportParticipantRow";
import { useAuth } from "../../contexts/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useJoinContest, useLeaveContest } from "../../hooks/useContestMutations";
import {
  useJoinContest as useJoinContestBlockchain,
  useLeaveContest as useLeaveContestBlockchain,
} from "../../hooks/useContestantOperations";
import { generateEntryId } from "../../utils/entryIdUtils";
import { captureContestEntryRecorded } from "../../lib/analytics/posthog";
import type { BatchTransactionStatusData } from "../../hooks/useBlockchainTransaction";
import { hasEnoughTokenBalance } from "../../lib/paymentTokenSpend";

import ContestContract from "../../utils/contracts/ContestController.json";

interface LineupManagementProps {
  contest: Contest;
  /** Called after a successful join when all user lineups are entered. */
  onCloseModal?: () => void;
  onOpenLineupsTab?: () => void;
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

const DEFAULT_USER_COLOR = "#9CA3AF";

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

export const LineupManagement: React.FC<LineupManagementProps> = ({
  contest,
  onCloseModal,
  onOpenLineupsTab,
}) => {
  const posthog = usePostHog();
  const sportId = contest.event?.sportId ?? "";
  const { status, metadata } = useContestEvent(contest);
  const { lineups, isLoading: isLineupsLoading, lineupError } = useLineupData({
    eventId: contest.eventId,
  });
  const { data: candidates = [] } = useEventCandidatesQuery(sportId, contest.eventId);
  const candidatesByParticipantId = useMemo(
    () => candidatesByParticipantIdMap(candidates),
    [candidates],
  );
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const balanceAddress = smartWalletClient?.account?.address ?? address;
  const { user, paymentTokenBalance, balancesUnavailable } = useAuth();
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

  const contestId = contest.id;

  const userContestLineups = useMemo(() => {
    return contest?.contestLineups?.filter((lineup) => lineup.userId === user?.id) || [];
  }, [contest?.contestLineups, user?.id]);

  const enteredLineupsMap = useMemo(() => {
    const map = new Map<string, string>();
    userContestLineups.forEach((cl) => {
      const key = cl.lineupId;
      if (key) map.set(key, cl.id);
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
    onSuccess: async (statusData: BatchTransactionStatusData) => {
      if (
        pendingAction?.type === "join" &&
        pendingAction?.entryId &&
        user?.id &&
        pendingAction.lineupId
      ) {
        const txHash = statusData.receipts[0]?.transactionHash;
        captureContestEntryRecorded(posthog, {
          user_id: user.id,
          contest_id: contestId,
          entry_id: pendingAction.entryId,
          chain_id: contest.chainId,
          transaction_hash: txHash,
        });
      }
      if (pendingAction?.type === "join" && pendingAction?.lineupId && pendingAction?.entryId) {
        const joinedLineupId = pendingAction.lineupId;
        try {
          await joinContest.mutateAsync({
            contestId,
            lineupId: joinedLineupId,
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
    data: primaryDepositRaw,
    isPending: isPrimaryDepositLoading,
    isError: isPrimaryDepositError,
  } = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryDepositAmount",
    args: [],
  });
  const contestantDepositAmount: bigint | undefined =
    typeof primaryDepositRaw === "bigint" ? primaryDepositRaw : undefined;

  const { data: contestPaymentTokenOnChain } = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "paymentToken",
    args: [],
    query: { enabled: !!contest.address },
  });

  const contestPaymentToken =
    (typeof contestPaymentTokenOnChain === "string"
      ? contestPaymentTokenOnChain
      : contest.settings?.paymentTokenAddress) ?? "";

  const { data: contestTokenBalanceData } = useBalance({
    address: balanceAddress,
    token: contestPaymentToken as `0x${string}`,
    query: {
      enabled: !!balanceAddress && !!contestPaymentToken && !!user,
    },
  });

  const spendableForContest =
    contestTokenBalanceData?.value ?? paymentTokenBalance ?? 0n;

  // Modals
  const [warningModal, setWarningModal] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  // Helper: check if user has enough balance (0 primary deposit always passes)
  const hasEnoughBalance = useMemo(() => {
    if (contestantDepositAmount === undefined) return false;
    if (contestantDepositAmount === 0n) return true;

    return hasEnoughTokenBalance(spendableForContest, contestantDepositAmount);
  }, [spendableForContest, contestantDepositAmount]);

  // Helper function to check if lineup with same players already exists in contest
  const checkForDuplicateInContest = useCallback(
    (lineupId: string): boolean => {
      const lineup = lineups.find((l) => l.id === lineupId);
      if (!lineup) return false;

      const normalizedPlayerIds = platformLineupParticipantIds(lineup).sort().join(",");
      const prediction = platformLineupPrediction(lineup);

      return (
        contest.contestLineups?.some((contestLineup) => {
          if (contestLineup.userId !== user?.id) return false;

          const contestLineupId = contestLineup.lineupId;
          const contestPlatformLineup = lineups.find((l) => l.id === contestLineupId);
          if (!contestPlatformLineup) return false;

          const contestPlayerIds = platformLineupParticipantIds(contestPlatformLineup)
            .sort()
            .join(",");
          return (
            contestPlayerIds === normalizedPlayerIds &&
            platformLineupPrediction(contestPlatformLineup) === prediction
          );
        }) || false
      );
    },
    [lineups, contest.contestLineups, user?.id],
  );

  const handleJoinContest = async (lineupId: string) => {
    // Find the lineup being added
    const lineup = lineups.find((l) => l.id === lineupId);

    // Validate lineup has at least 1 player
    if (!lineup || platformLineupParticipantIds(lineup).length === 0) {
      setValidationError("Lineup must have at least 1 player");
      return;
    }

    // Check for duplicate player set in contest
    if (checkForDuplicateInContest(lineupId)) {
      setValidationError(
        "You already have a lineup with these players and tie-breaker in this contest",
      );
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

    if (balancesUnavailable) {
      setSubmissionError(
        "Could not load your wallet balance. Check your connection and try again from Account.",
      );
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

    const calls = createJoinContestCalls(
      contest.address as string,
      entryId,
      contestantDepositAmount,
      contestPaymentToken,
    );

    await executeJoinBlockchain(calls);
  };

  const handleLeaveContest = async (lineupId: string) => {
    setSubmissionError(null);

    const contestLineup = contest.contestLineups?.find(
      (cl) => cl.lineupId === lineupId && cl.userId === user?.id,
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
    contest.settings?.primaryDeposit === 0 ? "Free" : `$${contest.settings?.primaryDeposit ?? 0}`;
  const userSettings = user?.settings;
  const maybeUserColor =
    typeof userSettings === "object" && userSettings !== null
      ? (userSettings as { color?: unknown }).color
      : undefined;
  const resolvedBorderColor = isValidHexColor(maybeUserColor) ? maybeUserColor : DEFAULT_USER_COLOR;
  const userDisplayName = user?.name || user?.email || "Unknown User";

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-gray-100 p-4 pt-2">
      {/* <h3 className="text-sm font-medium text-gray-900">My Lineups</h3> */}

      {isLineupsLoading && (
        <div className="py-8 min-h-48">
          <div className="flex flex-col items-center justify-center gap-3">
            <LoadingSpinner />
            <p className="text-sm font-display text-slate-500">Loading lineups...</p>
          </div>
        </div>
      )}

      {!isLineupsLoading &&
        lineups.map((lineup) => {
          const isEntered = enteredLineupsMap.has(lineup.id);
          const isPending = pendingAction?.lineupId === lineup.id;
          const isProcessing = isPending && (isSending || isConfirming);
          const sortedCandidates = sortCandidatesByLeaderboard(
            candidatesForPlatformLineup(lineup, candidatesByParticipantId),
          );

          return (
            <Fragment key={lineup.id}>
              <div className="group mb-2 rounded-xl border border-gray-200 bg-white shadow transition-[box-shadow] duration-200 hover:shadow-md">
                <div className="overflow-hidden rounded-sm border border-slate-200/90 bg-white">
                  {/* Header */}
                  <div className="flex items-center gap-2 border-b border-slate-200">
                    <div
                      className="min-w-0 flex-1 border-l-[5px] pl-3 font-display p-3 py-4"
                      style={{ borderLeftColor: resolvedBorderColor }}
                    >
                      <div className="truncate text-base font-semibold leading-tight text-gray-900">
                        {userDisplayName}
                      </div>
                      <div className="truncate text-xs leading-tight text-gray-600">
                        {lineup.name || `Lineup ${lineup.id.slice(-6)}`}
                      </div>
                    </div>

                    {/* Entered badge */}
                    {isEntered && (
                      <div className="ml-auto mr-4 inline-flex items-center gap-1 rounded-full border border-emerald-700/80 bg-emerald-600 px-2.5 py-0.5 shadow-sm">
                        <svg
                          className="h-3.5 w-3.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-xs font-semibold text-white">Entered</span>
                      </div>
                    )}
                  </div>

                  {sortedCandidates.length === 0 ? (
                    <p className="px-3 py-6 text-center font-display text-sm text-slate-700">
                      No players selected
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {sortedCandidates.map((candidate) => (
                        <div key={candidate.participantId} className="px-3 py-1">
                          <SportParticipantRow
                            candidate={candidate}
                            status={status}
                            eventMetadata={metadata}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 px-4 pb-4">
                  {isEntered ? (
                    <button
                      onClick={() => handleLeaveContest(lineup.id)}
                      disabled={isProcessing}
                      className="w-full rounded-lg border border-gray-400/50 bg-gray-200 px-4 py-2.5 text-sm font-medium font-display text-gray-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                  ) : sortedCandidates.length === 0 ? (
                    <button
                      type="button"
                      onClick={onOpenLineupsTab}
                      className="block w-full rounded-lg border border-blue-500 bg-blue-500 px-4 py-2.5 text-center text-sm font-semibold font-display text-white shadow-md transition-colors hover:border-blue-600 hover:bg-blue-600"
                    >
                      Select players
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoinContest(lineup.id)}
                      disabled={isProcessing || isPrimaryDepositLoading}
                      className="w-full rounded-lg border border-blue-500 bg-blue-500 px-4 py-2.5 text-sm font-semibold font-display text-white shadow-md transition-colors hover:border-blue-600 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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
            </Fragment>
          );
        })}

      {!isLineupsLoading && lineups.length === 0 && (
        <button
          type="button"
          onClick={onOpenLineupsTab}
          className="block w-full rounded-lg border border-blue-500 bg-blue-500 px-4 py-2.5 text-center text-sm font-semibold font-display text-white shadow-md transition-colors hover:border-blue-600 hover:bg-blue-600"
        >
          Select players
        </button>
      )}

      {/* Error Display */}
      {(lineupError ||
        validationError ||
        submissionError ||
        serverError ||
        transactionError ||
        isFailed) && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {lineupError ||
            validationError ||
            submissionError ||
            serverError ||
            transactionError ||
            "The transaction was rejected or failed to execute. Please try again."}
        </div>
      )}

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
                <DialogPanel className="w-full max-w-md transform rounded-sm bg-white text-left align-middle shadow-xl transition-all">
                  <div className="p-6">
                    <DialogTitle className="text-lg font-semibold text-red-600 mb-2">
                      Warning
                    </DialogTitle>
                    <div className="text-gray-800 mb-4 font-display">{warningModal.message}</div>
                    <button
                      type="button"
                      onClick={() => setWarningModal({ open: false, message: "" })}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
    </div>
  );
};
