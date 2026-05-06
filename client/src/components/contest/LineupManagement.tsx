import React, { Fragment, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { formatUnits, parseUnits } from "viem";
import { usePostHog } from "posthog-js/react";
import { useReadContract } from "wagmi";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";

import { Contest } from "src/types/contest";
import { useLineupData } from "../../hooks/useLineupData";
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
import { sortPlayersByLeaderboard } from "../../utils/playerSorting";

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

const DEFAULT_USER_COLOR = "#9CA3AF";

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

export const LineupManagement: React.FC<LineupManagementProps> = ({ contest, onCloseModal }) => {
  const posthog = usePostHog();
  const { lineups, isLoading: isLineupsLoading, lineupError } = useLineupData();
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
    contest.settings?.primaryDeposit === 0 ? "Free" : `$${contest.settings?.primaryDeposit ?? 0}`;
  const userSettings = user?.settings;
  const maybeUserColor =
    typeof userSettings === "object" && userSettings !== null
      ? (userSettings as { color?: unknown }).color
      : undefined;
  const resolvedBorderColor = isValidHexColor(maybeUserColor) ? maybeUserColor : DEFAULT_USER_COLOR;
  const userDisplayName = user?.name || user?.email || "Unknown User";

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-gray-100 p-2">
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
          const sortedPlayers = sortPlayersByLeaderboard(lineup.players ?? []);

          return (
            <Fragment key={lineup.id}>
              <div className="group mb-3 rounded-xl border border-gray-200 bg-white p-4 shadow transition-[box-shadow] duration-200 hover:shadow-md">
                <div className="overflow-hidden rounded-sm border border-slate-200/90 bg-white">
                  <div className="flex items-center gap-2 border-b border-slate-200">
                    <div
                      className="min-w-0 flex-1 border-l-[5px] pl-3 py-1 font-display px-3 py-2.5"
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
                      <div className="ml-auto mr-2 inline-flex items-center gap-1 rounded-full border border-emerald-700/80 bg-emerald-600 px-2.5 py-0.5 shadow-sm">
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

                  {sortedPlayers.length === 0 ? (
                    <p className="px-3 py-6 text-center font-display text-sm text-slate-700">
                      No players selected
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {sortedPlayers.map((player, pickIndex) => {
                        const first = (player.pga_firstName ?? "").trim();
                        const last = (player.pga_lastName ?? "").trim();
                        const displayName =
                          player.pga_displayName?.trim() ||
                          (first && last ? `${first} ${last}` : first || last) ||
                          "Unknown Player";
                        return (
                          <div
                            key={player.id}
                            className="flex min-w-0 items-center gap-3 px-3 py-2.5"
                          >
                            <span
                              className="w-6 shrink-0 text-center font-display text-xs font-bold tabular-nums text-slate-400"
                              aria-hidden
                            >
                              {pickIndex + 1}
                            </span>
                            <span className="min-w-0 truncate font-display text-sm font-semibold leading-snug text-slate-800">
                              {displayName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4">
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
        <Link
          to="/lineups/create"
          className="w-full block text-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded border border-blue-500 transition-colors text-sm font-display"
        >
          Add Lineup
        </Link>
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
