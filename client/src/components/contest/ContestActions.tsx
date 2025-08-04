import React, { useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { useNavigate } from "react-router-dom";

import {
  useBalance,
  useAccount,
  useSendCalls,
  useWaitForCallsStatus,
  useChainId,
  useReadContract,
} from "wagmi";

import { Contest } from "src/types.new/contest";
import { useContestApi } from "../../services/contestApi";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { useLineup } from "../../contexts/LineupContext";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { LineupSelectionModal } from "./LineupSelectionModal";

// Import contract addresses and ABIs
import PlatformTokenContract from "../../utils/contracts/PlatformToken.json";
import EscrowContract from "../../utils/contracts/Escrow.json";
import { getContractAddress } from "../../utils/contractConfig";

interface ContestActionsProps {
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

export const ContestActions: React.FC<ContestActionsProps> = ({ contest, onSuccess }) => {
  const navigate = useNavigate();
  const { user } = usePortoAuth();
  const { lineups, getLineups } = useLineup();
  const { addLineupToContest, removeLineupFromContest } = useContestApi();
  const userContestLineup = contest?.contestLineups?.find((lineup) => lineup.userId === user?.id);
  const userInContest = userContestLineup?.userId === user?.id;
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<"join" | "leave" | null>(null);

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

  // Get the payment token address from the escrow contract
  const escrowPaymentToken = useReadContract({
    address: contest.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "paymentToken",
    args: [],
  }).data as `0x${string}` | undefined;

  // Get the deposit amount from the escrow contract
  const escrowDetails = useReadContract({
    address: contest.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "details",
    args: [],
  }).data as [string, bigint, bigint, bigint] | undefined;

  // get the platform token balance from the user
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress") ?? "";
  const { data: platformTokenBalance } = useBalance({
    address: userAddress as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
    chainId: chainId ?? 0,
  });

  // Modals
  const [warningModal, setWarningModal] = React.useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });
  const [lineupSelectionModal, setLineupSelectionModal] = React.useState(false);
  const [selectedLineupId, setSelectedLineupId] = React.useState<string | null>(null);

  // Helper: check if user has enough balance
  const hasEnoughBalance = React.useMemo(() => {
    if (!platformTokenBalance || !escrowDetails) return false;

    // Use the deposit amount from the escrow contract
    const depositAmount = escrowDetails[1]; // depositAmount is the second element
    const hasEnough = platformTokenBalance.value >= depositAmount;

    if (!hasEnough) {
      console.log({
        depositAmount: depositAmount.toString(),
        balanceValue: platformTokenBalance.value.toString(),
        hasEnoughBalance: hasEnough,
        contestAddress: contest.address,
        escrowPaymentToken: escrowPaymentToken,
      });
    }

    return hasEnough;
  }, [platformTokenBalance, escrowDetails]);

  // Effect to handle blockchain confirmation
  useEffect(() => {
    const handleBlockchainConfirmation = async () => {
      if (isConfirmed && pendingAction) {
        try {
          // Add lineup to contest in backend
          if (pendingAction === "join" && selectedLineupId) {
            await addLineupToContest(contest.id, { tournamentLineupId: selectedLineupId });
            await getLineups(contest.tournamentId); // Refresh lineups
          } else if (pendingAction === "leave") {
            if (userContestLineup) {
              await removeLineupFromContest(contest.id, userContestLineup.id);
              await getLineups(contest.tournamentId); // Refresh lineups
            }
          }

          // Refresh contest data
          onSuccess(contest);
          setPendingAction(null);
          setSelectedLineupId(null);
        } catch (error) {
          console.error("Error updating contest:", error);
          setServerError(
            `Failed to update contest: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          setPendingAction(null);
        }
      }
    };

    handleBlockchainConfirmation();
  }, [
    isConfirmed,
    pendingAction,
    selectedLineupId,
    contest.id,
    userContestLineup,
    addLineupToContest,
    removeLineupFromContest,
    getLineups,
    onSuccess,
    contest,
  ]);

  const handleJoinContest = async () => {
    if (!hasEnoughBalance) {
      setWarningModal({
        open: true,
        message: `You do not have enough ${
          contest?.settings?.platformTokenSymbol || "tokens"
        } to join this contest. You can view your balance on the "User" page. Contact your admin to fund your account.`,
      });
      return;
    }

    if (!escrowDetails) {
      setSubmissionError("Unable to read contest details from blockchain");
      return;
    }

    try {
      setPendingAction("join");

      // Get the deposit amount from escrow details
      const depositAmount = escrowDetails[1]; // depositAmount is the second element

      // Execute blockchain transaction with both approval and transfer
      await sendCalls({
        calls: [
          {
            abi: PlatformTokenContract.abi,
            args: [
              contest.address as `0x${string}`,
              depositAmount, // Use the actual deposit amount from escrow
            ],
            functionName: "approve",
            to: platformTokenAddress as `0x${string}`,
          },
          {
            abi: EscrowContract.abi,
            args: [],
            functionName: "deposit",
            to: contest.address as `0x${string}`,
          },
        ],
      });
    } catch (err) {
      console.error("Error joining contest:", err);
      setSubmissionError(
        `Failed to join contest: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setPendingAction(null);
    }
  };

  const handleLeaveContest = async () => {
    try {
      setPendingAction("leave");

      // Execute blockchain transaction to withdraw from escrow
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

      {/* Buttons */}
      {userInContest ? (
        <button
          className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
          onClick={handleLeaveContest}
          disabled={!userInContest || isSending || isConfirming}
        >
          {isSending || isConfirming ? (
            <div className="flex items-center gap-2 w-full justify-center">
              <LoadingSpinnerSmall />
              {getStatusMessages("idle", isSending, isConfirming)}
            </div>
          ) : (
            "Leave Contest"
          )}
        </button>
      ) : (
        <button
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
          onClick={() => setLineupSelectionModal(true)}
          disabled={userInContest || isSending || isConfirming}
        >
          {isSending || isConfirming ? (
            <div className="flex items-center gap-2 w-full justify-center">
              <LoadingSpinnerSmall />
              {getStatusMessages("idle", isSending, isConfirming)}
            </div>
          ) : (
            "Join Contest"
          )}
        </button>
      )}

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
