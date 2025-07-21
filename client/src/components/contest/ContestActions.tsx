import React, { useEffect } from "react";
import { Dialog } from "@headlessui/react";

import { formatUnits, parseUnits } from "viem";
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
import { paymentTokenAddress } from "../../utils/contracts/sepolia.json";
import PlatformTokenContract from "../../utils/contracts/PlatformToken.json";
import ContestContract from "../../utils/contracts/Contest.json";

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
  const { user } = usePortoAuth();
  const { lineups, getLineups } = useLineup();
  const { addLineupToContest, removeLineupFromContest } = useContestApi();
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { data: paymentTokenBalance } = useBalance({
    address: userAddress as `0x${string}`,
    token: paymentTokenAddress as `0x${string}`,
    chainId: chainId ?? 0,
  });

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<"join" | "leave" | null>(null);
  const [warningModal, setWarningModal] = React.useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });
  const [lineupSelectionModal, setLineupSelectionModal] = React.useState(false);
  const [selectedLineupId, setSelectedLineupId] = React.useState<string | null>(null);

  // Define the expected tuple type for details
  type ContestDetailsTuple = [string, bigint, bigint, bigint];

  // Use type assertion when reading the value
  const contestDetailsRaw = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "details",
    args: [],
  }).data as ContestDetailsTuple | undefined;
  const displayFee = formatUnits(
    (contestDetailsRaw as unknown as ContestDetailsTuple)?.[1] ?? 0n,
    18
  );

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
    // status: confirmationStatus,
    // data: confirmationData,
  } = useWaitForCallsStatus({
    id: sendCallsData?.id,
  });

  // find user lineup in contest
  const userContestLineup = contest?.contestLineups?.find((lineup) => lineup.userId === user?.id);
  const userInContest = userContestLineup?.userId === user?.id;

  // Helper: check if user has enough balance
  const hasEnoughBalance = React.useMemo(() => {
    if (!paymentTokenBalance || !contest.settings?.fee) return false;
    try {
      // paymentTokenBalance.value is a BigInt
      return paymentTokenBalance.value >= parseUnits(contest.settings.fee.toString(), 18);
    } catch {
      return false;
    }
  }, [paymentTokenBalance, contest.settings?.fee]);

  // Effect to handle API call after blockchain confirmation
  useEffect(() => {
    const handleBlockchainConfirmation = async () => {
      if (isConfirmed && pendingAction && sendCallsData?.id) {
        try {
          let updatedContest;
          if (pendingAction === "join") {
            updatedContest = await addLineupToContest(contest.id, {
              tournamentLineupId: selectedLineupId ?? "",
            });
          } else if (pendingAction === "leave") {
            updatedContest = await removeLineupFromContest(contest.id, userContestLineup?.id ?? "");
          }

          if (updatedContest) {
            onSuccess(updatedContest);
          }
        } catch (err) {
          setServerError(
            `Failed to ${pendingAction} contest: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        } finally {
          setPendingAction(null);
        }
      }
    };

    handleBlockchainConfirmation();
  }, [
    isConfirmed,
    pendingAction,
    sendCallsData?.id,
    contest.id,
    selectedLineupId,
    userContestLineup?.id,
    addLineupToContest,
    removeLineupFromContest,
    onSuccess,
  ]);

  const handleJoinContest = async () => {
    // Always load lineups and show selection modal
    if (lineups.length === 0) {
      try {
        await getLineups(contest.tournamentId);
      } catch (error) {
        console.error("Failed to load lineups:", error);
      }
    }
    setLineupSelectionModal(true);
  };

  const handleLeaveContest = async () => {
    try {
      setPendingAction("leave");

      // Execute blockchain transaction
      await sendCalls({
        calls: [
          {
            abi: ContestContract.abi,
            args: [],
            functionName: "leave",
            to: contest.address as `0x${string}`,
          },
        ],
      });

      // console.log("Leave contest transaction:", result);
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

    if (!hasEnoughBalance) {
      setWarningModal({
        open: true,
        message: `You do not have enough ${
          contest?.settings?.paymentTokenSymbol || "tokens"
        } to join this contest. You can view your balance on the "User" page. Contact your admin to fund your account.`,
      });
      return;
    }

    try {
      setPendingAction("join");

      // Execute blockchain transaction with both approval and transfer
      await sendCalls({
        calls: [
          {
            abi: PlatformTokenContract.abi,
            args: [
              contest.address as `0x${string}`,
              parseUnits(contest.settings?.fee?.toString() ?? "0", 18),
            ],
            functionName: "approve",
            to: paymentTokenAddress as `0x${string}`,
          },
          {
            abi: ContestContract.abi,
            args: [],
            functionName: "enter",
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

  const handleCreateNewLineup = () => {
    setLineupSelectionModal(false);
    // Navigate to lineup creation page
    window.location.href = "/lineups/create";
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
          onClick={handleJoinContest}
          disabled={userInContest || isSending || isConfirming}
        >
          {isSending || isConfirming ? (
            <div className="flex items-center gap-2 w-full justify-center">
              <LoadingSpinnerSmall />
              {getStatusMessages("idle", isSending, isConfirming)}
            </div>
          ) : (
            `Join Contest - $${displayFee} `
          )}
        </button>
        // ${paymentTokenBalance?.symbol}
      )}

      {/* Add status display */}
      <div className="mt-2 text-sm text-center text-red-500">
        {/* Submission error */}
        {submissionError && <div>Submission Error: {submissionError}</div>}

        {/* Confirmation error */}
        {confirmationError && (
          <div>
            {(confirmationError as { shortMessage?: string; message: string }).shortMessage ||
              confirmationError.message}
          </div>
        )}

        {/* Send calls error */}
        {sendCallsError && (
          <div>
            {(sendCallsError as { shortMessage?: string; message: string }).shortMessage ||
              sendCallsError.message}
          </div>
        )}

        {/* Server error */}
        {serverError && <div>Server Error: {serverError}</div>}
      </div>
    </div>
  );
};
