import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatUnits, parseUnits } from "viem";
import {
  useBalance,
  useAccount,
  useSendCalls,
  useWaitForCallsStatus,
  useChainId,
  useReadContract,
} from "wagmi";
import { Dialog } from "@headlessui/react";

import { Contest } from "src/types/contest";
import { useLineup } from "../../contexts/LineupContext";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useJoinContest, useLeaveContest } from "../../hooks/useContestMutations";

// Import contract addresses and ABIs
import PlatformTokenContract from "../../utils/contracts/PlatformToken.json";
import EscrowContract from "../../utils/contracts/Escrow.json";
import DepositManagerContract from "../../utils/contracts/DepositManager.json";
import { getContractAddress } from "../../utils/blockchainUtils.tsx";

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
    return "Waiting for User...";
  }

  if (isBlockchainWaiting) {
    return "Waiting for Blockchain...";
  }

  return defaultMessage;
};

// Helper functions for decimal conversion
const PAYMENT_TOKEN_DECIMALS = 6;
const PLATFORM_TOKEN_DECIMALS = 18;

const convertPaymentToPlatformTokens = (paymentTokenAmount: bigint): bigint => {
  const humanReadableAmount = formatUnits(paymentTokenAmount, PAYMENT_TOKEN_DECIMALS);
  return parseUnits(humanReadableAmount, PLATFORM_TOKEN_DECIMALS);
};

const convertPlatformToPaymentTokens = (platformTokenAmount: bigint): bigint => {
  const humanReadableAmount = formatUnits(platformTokenAmount, PLATFORM_TOKEN_DECIMALS);
  return parseUnits(humanReadableAmount, PAYMENT_TOKEN_DECIMALS);
};

export const LineupManagement: React.FC<LineupManagementProps> = ({ contest }) => {
  const navigate = useNavigate();
  const { lineups, getLineups } = useLineup();
  const { user } = usePortoAuth();
  const joinContest = useJoinContest();
  const leaveContest = useLeaveContest();

  const [serverError, setServerError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "join" | "leave";
    lineupId: string;
  } | null>(null);

  // Extract primitive values to prevent re-renders
  const contestId = contest.id;
  const tournamentId = contest.tournamentId;

  // Wagmi functions
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const {
    sendCalls,
    data: sendCallsData,
    isPending: isSending,
    error: sendCallsError,
    reset: resetSendCalls,
  } = useSendCalls();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmationError,
  } = useWaitForCallsStatus({
    id: sendCallsData?.id,
  });

  // Get the deposit amount from the escrow contract
  const escrowDetails = useReadContract({
    address: contest.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "details",
    args: [],
  }).data as [bigint, bigint] | undefined;

  // Check if the user has deposited to this escrow contract
  const { data: hasDeposited } = useReadContract({
    address: contest.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "hasDeposited",
    args: [userAddress],
  });

  // Get token balances
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress") ?? "";
  const { data: platformTokenBalance } = useBalance({
    address: userAddress as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
    chainId: chainId ?? 0,
  });

  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress") ?? "";
  const { data: paymentTokenBalance } = useBalance({
    address: userAddress as `0x${string}`,
    token: paymentTokenAddress as `0x${string}`,
    chainId: chainId ?? 0,
  });

  // Modals
  const [warningModal, setWarningModal] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  // Helper: check if user has enough balance
  const hasEnoughBalance = useMemo(() => {
    if (!escrowDetails) return false;

    const depositAmount = escrowDetails[0];
    const platformTokenAmount = platformTokenBalance?.value ?? 0n;
    const paymentTokenAmount = paymentTokenBalance?.value ?? 0n;
    const paymentTokenAsPlatformTokens = convertPaymentToPlatformTokens(paymentTokenAmount);
    const totalAvailableBalance = platformTokenAmount + paymentTokenAsPlatformTokens;

    return totalAvailableBalance >= depositAmount;
  }, [platformTokenBalance, paymentTokenBalance, escrowDetails]);

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

  // Effect to handle blockchain confirmation
  useEffect(() => {
    const handleBlockchainConfirmation = async () => {
      if (!isConfirmed || !pendingAction) {
        return;
      }

      try {
        if (pendingAction.type === "join") {
          await joinContest.mutateAsync({
            contestId,
            tournamentLineupId: pendingAction.lineupId,
          });
        } else if (pendingAction.type === "leave") {
          const contestLineupId = enteredLineupsMap.get(pendingAction.lineupId);
          if (contestLineupId) {
            await leaveContest.mutateAsync({
              contestId,
              contestLineupId,
            });
          }
        }

        await getLineups(tournamentId);
        setPendingAction(null);
        setServerError(null);
        resetSendCalls();
      } catch (error) {
        console.error(`Error ${pendingAction.type}ing contest:`, error);
        setServerError(
          `Failed to ${pendingAction.type} contest: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setPendingAction(null);
      }
    };

    handleBlockchainConfirmation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, pendingAction, contestId, tournamentId]);

  const handleJoinContest = async (lineupId: string) => {
    if (!hasEnoughBalance) {
      setWarningModal({
        open: true,
        message: `You do not have enough ${
          contest?.settings?.platformTokenSymbol || "tokens"
        } or USDC to join this contest. You can view your balance on the "User" page. Contact your admin to fund your account.`,
      });
      return;
    }

    if (!escrowDetails) {
      setSubmissionError("Unable to read contest details from blockchain");
      return;
    }

    try {
      setPendingAction({ type: "join", lineupId });

      const depositAmount = escrowDetails[0];
      const platformTokenAmount = platformTokenBalance?.value ?? 0n;
      const paymentTokenAmount = paymentTokenBalance?.value ?? 0n;

      const platformTokensNeeded =
        depositAmount > platformTokenAmount ? depositAmount - platformTokenAmount : 0n;
      const paymentTokensNeeded = convertPlatformToPaymentTokens(platformTokensNeeded);

      const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress") ?? "";

      const calls = [];

      // If we need to swap payment tokens for platform tokens
      if (platformTokensNeeded > 0n && paymentTokenAmount >= paymentTokensNeeded) {
        calls.push({
          abi: [
            {
              type: "function",
              name: "approve",
              inputs: [
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
              ],
              outputs: [{ name: "", type: "bool" }],
              stateMutability: "nonpayable",
            },
          ],
          args: [depositManagerAddress as `0x${string}`, paymentTokensNeeded],
          functionName: "approve",
          to: paymentTokenAddress as `0x${string}`,
        });

        calls.push({
          abi: DepositManagerContract.abi,
          args: [paymentTokensNeeded],
          functionName: "depositUSDC",
          to: depositManagerAddress as `0x${string}`,
        });
      }

      // Approve the escrow contract to spend platform tokens
      calls.push({
        abi: PlatformTokenContract.abi,
        args: [contest.address as `0x${string}`, depositAmount],
        functionName: "approve",
        to: platformTokenAddress as `0x${string}`,
      });

      // Deposit to the escrow contract
      calls.push({
        abi: EscrowContract.abi,
        args: [],
        functionName: "deposit",
        to: contest.address as `0x${string}`,
      });

      await sendCalls({ calls });
    } catch (err) {
      console.error("Error joining contest:", err);
      setSubmissionError(
        `Failed to join contest: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setPendingAction(null);
    }
  };

  const handleLeaveContest = async (lineupId: string) => {
    try {
      setPendingAction({ type: "leave", lineupId });

      if (!hasDeposited) {
        setSubmissionError(
          `You have not deposited to this contest. Your wallet address: ${userAddress}`
        );
        setPendingAction(null);
        return;
      }

      await sendCalls({
        calls: [
          {
            abi: EscrowContract.abi,
            args: [],
            functionName: "withdraw",
            to: contest.address as `0x${string}`,
          },
        ],
      });
    } catch (err) {
      console.error("Error leaving contest:", err);
      setSubmissionError(
        `Failed to leave contest: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setPendingAction(null);
    }
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
          <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-xl shadow-lg">
            <div className="p-6">
              <Dialog.Title className="text-lg font-semibold text-red-600 mb-2">
                Warning
              </Dialog.Title>
              <div className="text-gray-800 mb-4">{warningModal.message}</div>
              <button
                onClick={() => setWarningModal({ open: false, message: "" })}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <div className="">
        <h3 className="text-sm font-medium text-gray-900 mb-2">My Lineups</h3>

        {lineups.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-500 mb-3">No lineups found for this tournament.</p>
            <button
              onClick={() => navigate("/lineups/create")}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Create New Lineup
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {lineups.map((lineup) => {
              const isEntered = enteredLineupsMap.has(lineup.id);
              const isPending = pendingAction?.lineupId === lineup.id;
              const isProcessing = isPending && (isSending || isConfirming);

              return (
                <div
                  key={lineup.id}
                  className={`border rounded-lg p-3 ${
                    isEntered ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {lineup.name || `Lineup ${lineup.id.slice(-6)}`}
                        </h4>
                        {isEntered && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded">
                            Entered
                          </span>
                        )}
                      </div>
                      {lineup.players && lineup.players.length > 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          {lineup.players.map((player, idx) => (
                            <span key={player.id}>
                              {player.pga_displayName ||
                                `${player.pga_firstName} ${player.pga_lastName}`}
                              {idx < lineup.players.length - 1 && ", "}
                            </span>
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
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

            <button
              onClick={() => navigate("/lineups/create")}
              className="w-full mt-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              + Create New Lineup
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {(submissionError || serverError || sendCallsError || confirmationError) && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {submissionError ||
            serverError ||
            (sendCallsError as Error)?.message ||
            (confirmationError as Error)?.message ||
            "An error occurred"}
        </div>
      )}
    </div>
  );
};
