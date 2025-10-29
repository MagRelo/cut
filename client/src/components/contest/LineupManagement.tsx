import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { formatUnits, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

import { Contest } from "src/types/contest";
import { useLineup } from "../../contexts/LineupContext";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useJoinContest, useLeaveContest } from "../../hooks/useContestMutations";
import {
  useJoinContest as useJoinContestBlockchain,
  useLeaveContest as useLeaveContestBlockchain,
} from "../../hooks/useContestantOperations";
import { generateEntryId } from "../../utils/entryIdUtils";

// Import contract ABIs
import ContestContract from "../../utils/contracts/Contest.json";

interface LineupManagementProps {
  contest: Contest;
}

// Helper function to get status messages
const getStatusMessages = (
  defaultMessage: string = "idle",
  isUserWaiting: boolean = false,
  isBlockchainWaiting: boolean = false
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

export const LineupManagement: React.FC<LineupManagementProps> = ({ contest }) => {
  const { lineups, getLineups } = useLineup();
  const { user, platformTokenBalance, paymentTokenBalance } = usePortoAuth();
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
  const tournamentId = contest.tournamentId;

  // Use Contest blockchain hooks
  const {
    execute: executeJoinBlockchain,
    // isProcessing: isJoinProcessing,
    isSending: isJoinSending,
    isConfirming: isJoinConfirming,
    isConfirmed: isJoinConfirmed,
    isFailed: isJoinFailed,
    error: joinError,
    createJoinContestCalls,
  } = useJoinContestBlockchain({
    onSuccess: async () => {
      if (pendingAction?.type === "join" && pendingAction?.lineupId && pendingAction?.entryId) {
        try {
          await joinContest.mutateAsync({
            contestId,
            tournamentLineupId: pendingAction.lineupId,
            entryId: pendingAction.entryId,
          });
          await getLineups(tournamentId);
          setPendingAction(null);
          setServerError(null);
        } catch (error) {
          console.error("Error joining contest:", error);
          setServerError(
            `Failed to join contest: ${error instanceof Error ? error.message : "Unknown error"}`
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
    isConfirmed: isLeaveConfirmed,
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
          await getLineups(tournamentId);
          setPendingAction(null);
          setServerError(null);
        } catch (error) {
          console.error("Error leaving contest:", error);
          setServerError(
            `Failed to leave contest: ${error instanceof Error ? error.message : "Unknown error"}`
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
  const isConfirmed = isJoinConfirmed || isLeaveConfirmed;
  const isFailed = isJoinFailed || isLeaveFailed;
  const transactionError = joinError || leaveError;

  // Get the deposit amount from the contest contract
  const contestantDepositAmount = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "contestantDepositAmount",
    args: [],
  }).data as bigint | undefined;

  // Modals
  const [warningModal, setWarningModal] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  // Helper: check if user has enough balance
  const hasEnoughBalance = useMemo(() => {
    if (!contestantDepositAmount) return false;

    const platformTokenAmount = platformTokenBalance ?? 0n;
    const paymentTokenAmount = paymentTokenBalance ?? 0n;
    const paymentTokenAsPlatformTokens = convertPaymentToPlatformTokens(paymentTokenAmount);
    const totalAvailableBalance = platformTokenAmount + paymentTokenAsPlatformTokens;

    return totalAvailableBalance >= contestantDepositAmount;
  }, [platformTokenBalance, paymentTokenBalance, contestantDepositAmount]);

  // Get user's contest lineups
  const userContestLineups = useMemo(() => {
    return contest?.contestLineups?.filter((lineup) => lineup.userId === user?.id) || [];
  }, [contest?.contestLineups, user?.id]);

  // Map of entered lineup IDs to contest lineup IDs
  const enteredLineupsMap = useMemo(() => {
    const map = new Map<string, string>();
    userContestLineups.forEach((cl) => {
      map.set(cl.tournamentLineupId, cl.id);
    });
    return map;
  }, [userContestLineups]);

  // Effect to handle pending action state
  useEffect(() => {
    if (pendingAction && isConfirmed) {
      // The onSuccess callbacks in the hooks will handle the rest
      setPendingAction(null);
    }
  }, [pendingAction, isConfirmed]);

  // Helper function to check if lineup with same players already exists in contest
  const checkForDuplicateInContest = (lineupId: string): boolean => {
    const lineup = lineups.find((l) => l.id === lineupId);
    if (!lineup) return false;

    // Normalize player IDs by sorting
    const normalizedPlayerIds = lineup.players
      .map((p) => p.id)
      .sort()
      .join(",");

    // Check if any contest lineup has the same player set
    return (
      contest.contestLineups?.some((contestLineup) => {
        // Only check user's own lineups
        if (contestLineup.userId !== user?.id) return false;

        // Get the tournament lineup for this contest lineup
        const contestTournamentLineup = lineups.find(
          (l) => l.id === contestLineup.tournamentLineupId
        );
        if (!contestTournamentLineup) return false;

        // Normalize and compare player sets
        const contestPlayerIds = contestTournamentLineup.players
          .map((p) => p.id)
          .sort()
          .join(",");
        return contestPlayerIds === normalizedPlayerIds;
      }) || false
    );
  };

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

    if (!hasEnoughBalance) {
      setWarningModal({
        open: true,
        message: `You do not have enough ${
          contest?.settings?.platformTokenSymbol || "tokens"
        } or USDC to join this contest. You can view your balance on the "User" page. Contact your admin to fund your account.`,
      });
      return;
    }

    if (!contestantDepositAmount) {
      setSubmissionError("Unable to read contest details from blockchain");
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
      paymentTokenAmount
    );

    await executeJoinBlockchain(calls);
  };

  const handleLeaveContest = async (lineupId: string) => {
    setPendingAction({ type: "leave", lineupId });
    setSubmissionError(null);

    // Find the contest lineup to get the entryId
    const contestLineup = contest.contestLineups?.find(
      (cl) => cl.tournamentLineupId === lineupId && cl.userId === user?.id
    );

    if (!contestLineup?.entryId) {
      setSubmissionError("Entry ID not found. Cannot leave contest.");
      return;
    }

    // Create and execute the leave contest calls
    const calls = createLeaveContestCalls(contest.address as string, Number(contestLineup.entryId));

    await executeLeaveBlockchain(calls);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Warning Modal */}
      <Dialog
        open={warningModal.open}
        onClose={() => setWarningModal({ open: false, message: "" })}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-md w-full bg-white rounded-sm shadow-lg">
            <div className="p-6">
              <DialogTitle className="text-lg font-semibold text-red-600 mb-2">Warning</DialogTitle>
              <div className="text-gray-800 mb-4">{warningModal.message}</div>
              <button
                onClick={() => setWarningModal({ open: false, message: "" })}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Close
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

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
                  disabled={isProcessing}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2 justify-center">
                      <LoadingSpinnerSmall />
                      {getStatusMessages("idle", isSending, isConfirming)}
                    </div>
                  ) : (
                    `Join Contest - $${contest.settings?.fee || 0}`
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
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold font-display rounded block text-center uppercase"
        >
          + Add Lineup
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
