import React, { useEffect } from "react";
import { Dialog } from "@headlessui/react";
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

import { Contest } from "src/types/contest";
import { useContestApi } from "../../services/contestApi";
import { useLineup } from "../../contexts/LineupContext";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { LineupSelectionModal } from "./LineupSelectionModal";

// Import contract addresses and ABIs
import PlatformTokenContract from "../../utils/contracts/PlatformToken.json";
import EscrowContract from "../../utils/contracts/Escrow.json";
import DepositManagerContract from "../../utils/contracts/DepositManager.json";
import { getContractAddress } from "../../utils/blockchainUtils.tsx";

interface JoinContestProps {
  contest: Contest;
  onSuccess: (contest: Contest) => void;
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
// Payment token (USDC) has 6 decimals, Platform token has 18 decimals
const PAYMENT_TOKEN_DECIMALS = 6;
const PLATFORM_TOKEN_DECIMALS = 18;

// Convert payment token amount to platform token equivalent (1:1 ratio but different decimals)
const convertPaymentToPlatformTokens = (paymentTokenAmount: bigint): bigint => {
  // Convert payment token to human readable format, then parse as platform token
  const humanReadableAmount = formatUnits(paymentTokenAmount, PAYMENT_TOKEN_DECIMALS);
  return parseUnits(humanReadableAmount, PLATFORM_TOKEN_DECIMALS);
};

// Convert platform token amount to payment token equivalent (1:1 ratio but different decimals)
const convertPlatformToPaymentTokens = (platformTokenAmount: bigint): bigint => {
  // Convert platform token to human readable format, then parse as payment token
  const humanReadableAmount = formatUnits(platformTokenAmount, PLATFORM_TOKEN_DECIMALS);
  return parseUnits(humanReadableAmount, PAYMENT_TOKEN_DECIMALS);
};

export const JoinContest: React.FC<JoinContestProps> = ({ contest, onSuccess }) => {
  const navigate = useNavigate();
  const { lineups, getLineups } = useLineup();
  const { addLineupToContest } = useContestApi();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<boolean>(false);

  // Wagmi functions
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const {
    sendCalls,
    data: sendCallsData,
    isPending: isSending,
    error: sendCallsError,
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

  // get the platform token balance from the user
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress") ?? "";
  const { data: platformTokenBalance } = useBalance({
    address: userAddress as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
    chainId: chainId ?? 0,
  });

  // get the payment token balance from the user
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress") ?? "";
  const { data: paymentTokenBalance } = useBalance({
    address: userAddress as `0x${string}`,
    token: paymentTokenAddress as `0x${string}`,
    chainId: chainId ?? 0,
  });

  // Modals
  const [warningModal, setWarningModal] = React.useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });
  const [lineupSelectionModal, setLineupSelectionModal] = React.useState(false);
  const [selectedLineupId, setSelectedLineupId] = React.useState<string | null>(null);

  // Helper: check if user has enough balance (sum of platform and payment tokens)
  const hasEnoughBalance = React.useMemo(() => {
    if (!escrowDetails) return false;

    // Use the deposit amount from the escrow contract
    const depositAmount = escrowDetails[0]; // depositAmount is the first element

    // Get current balances (default to 0 if undefined)
    const platformTokenAmount = platformTokenBalance?.value ?? 0n;
    const paymentTokenAmount = paymentTokenBalance?.value ?? 0n;

    // Convert payment token amount to platform token equivalent (accounting for decimals)
    const paymentTokenAsPlatformTokens = convertPaymentToPlatformTokens(paymentTokenAmount);

    // Calculate total available balance in platform token terms
    const totalAvailableBalance = platformTokenAmount + paymentTokenAsPlatformTokens;

    const hasEnough = totalAvailableBalance >= depositAmount;

    if (!hasEnough) {
      console.log({
        depositAmount: depositAmount.toString(),
        platformTokenBalance: platformTokenAmount.toString(),
        paymentTokenBalance: paymentTokenAmount.toString(),
        paymentTokenAsPlatformTokens: paymentTokenAsPlatformTokens.toString(),
        totalAvailableBalance: totalAvailableBalance.toString(),
        hasEnoughBalance: hasEnough,
        contestAddress: contest.address,
        escrowExpiry: escrowDetails[1],
      });
    }

    return hasEnough;
  }, [platformTokenBalance, paymentTokenBalance, escrowDetails, contest.address]);

  // Effect to handle blockchain confirmation
  useEffect(() => {
    const handleBlockchainConfirmation = async () => {
      if (isConfirmed && pendingAction && selectedLineupId) {
        try {
          // Add lineup to contest in backend
          const updatedContest = await addLineupToContest(contest.id, {
            tournamentLineupId: selectedLineupId,
          });
          await getLineups(contest.tournamentId); // Refresh lineups

          // Refresh contest data with the updated contest
          if (updatedContest) {
            onSuccess(updatedContest);
          }
          setPendingAction(false);
          setSelectedLineupId(null);
        } catch (error) {
          console.error("Error updating contest:", error);
          setServerError(
            `Failed to update contest: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          setPendingAction(false);
        }
      }
    };

    handleBlockchainConfirmation();
  }, [
    isConfirmed,
    pendingAction,
    selectedLineupId,
    contest.id,
    contest.tournamentId,
    addLineupToContest,
    getLineups,
    onSuccess,
  ]);

  const handleJoinContest = async () => {
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
      setPendingAction(true);

      // Get the deposit amount from escrow details
      const depositAmount = escrowDetails[0]; // depositAmount is the first element

      // Get current balances (default to 0 if undefined)
      const platformTokenAmount = platformTokenBalance?.value ?? 0n;
      const paymentTokenAmount = paymentTokenBalance?.value ?? 0n;

      // Calculate how many platform tokens we need to swap
      const platformTokensNeeded =
        depositAmount > platformTokenAmount ? depositAmount - platformTokenAmount : 0n;

      // Convert platform tokens needed to payment token equivalent (accounting for decimals)
      const paymentTokensNeeded = convertPlatformToPaymentTokens(platformTokensNeeded);

      // Get deposit manager address
      const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress") ?? "";

      const calls = [];

      // If we need to swap payment tokens for platform tokens, do it
      if (platformTokensNeeded > 0n && paymentTokenAmount >= paymentTokensNeeded) {
        // First approve the DepositManager to spend payment tokens
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

        // Then buy platform tokens with payment tokens (1:1 ratio)
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

      // Execute blockchain transaction
      await sendCalls({ calls });
    } catch (err) {
      console.error("Error joining contest:", err);
      setSubmissionError(
        `Failed to join contest: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setPendingAction(false);
    }
  };

  const handleLineupSelect = async (lineupId: string) => {
    setSelectedLineupId(lineupId);
    setLineupSelectionModal(false);
    await handleJoinContest();
  };

  const handleCreateNewLineup = () => {
    setLineupSelectionModal(false);
    // Navigate to lineup creation page
    navigate("/lineups/create");
  };

  // Get IDs of lineups already entered in this contest
  const enteredLineupIds = React.useMemo(() => {
    return contest?.contestLineups?.map((cl) => cl.tournamentLineupId) || [];
  }, [contest?.contestLineups]);

  return (
    <div className="flex flex-col gap-2">
      {/* Lineup Selection Modal */}
      <LineupSelectionModal
        isOpen={lineupSelectionModal}
        onClose={() => setLineupSelectionModal(false)}
        lineups={lineups}
        selectedLineupId={selectedLineupId}
        onSelectLineup={handleLineupSelect}
        onCreateNew={handleCreateNewLineup}
        enteredLineupIds={enteredLineupIds}
      />

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

      {/* Join Button */}
      <button
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
        onClick={() => setLineupSelectionModal(true)}
        disabled={isSending || isConfirming}
      >
        {isSending || isConfirming ? (
          <div className="flex items-center gap-2 w-full justify-center">
            <LoadingSpinnerSmall />
            {getStatusMessages("idle", isSending, isConfirming)}
          </div>
        ) : (
          "Join Contest" + " - $" + contest.settings?.fee
        )}
      </button>

      {/* Error Display */}
      {(submissionError || serverError || sendCallsError || confirmationError) && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
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
