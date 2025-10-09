import React, { useEffect } from "react";
import { useSendCalls, useWaitForCallsStatus, useReadContract, useAccount } from "wagmi";
import { Dialog } from "@headlessui/react";

import { Contest } from "src/types/contest";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { useLineup } from "../../contexts/LineupContext";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useLeaveContest } from "../../hooks/useContestMutations";

// Import contract ABIs
import EscrowContract from "../../utils/contracts/Escrow.json";

interface LeaveContestProps {
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

export const LeaveContest: React.FC<LeaveContestProps> = ({ contest }) => {
  const { user } = usePortoAuth();
  const { getLineups } = useLineup();
  const leaveContest = useLeaveContest();
  const { address: userAddress } = useAccount();

  // Get all user's lineups in this contest
  const userContestLineups = React.useMemo(() => {
    return contest?.contestLineups?.filter((lineup) => lineup.userId === user?.id) || [];
  }, [contest?.contestLineups, user?.id]);

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<boolean>(false);
  const [lineupSelectionModal, setLineupSelectionModal] = React.useState(false);
  const [selectedLineupId, setSelectedLineupId] = React.useState<string | null>(null);

  // Check if the user has actually deposited to this escrow contract
  const { data: hasDeposited } = useReadContract({
    address: contest.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "hasDeposited",
    args: [userAddress],
  });

  // Wagmi functions
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

  // Effect to handle blockchain confirmation
  useEffect(() => {
    const handleBlockchainConfirmation = async () => {
      if (isConfirmed && pendingAction && selectedLineupId) {
        try {
          // Remove lineup from contest using React Query mutation
          // This automatically updates the cache with optimistic updates!
          await leaveContest.mutateAsync({
            contestId: contest.id,
            contestLineupId: selectedLineupId,
          });

          await getLineups(contest.tournamentId); // Refresh lineups
          setPendingAction(false);
          setSelectedLineupId(null);
          setServerError(null);
        } catch (error) {
          console.error("Error leaving contest:", error);
          setServerError(
            `Failed to leave contest: ${error instanceof Error ? error.message : "Unknown error"}`
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
    leaveContest,
    getLineups,
  ]);

  const handleButtonClick = () => {
    // If user has multiple lineups, show selection modal
    if (userContestLineups.length > 1) {
      setLineupSelectionModal(true);
    } else if (userContestLineups.length === 1) {
      // If only one lineup, proceed directly
      setSelectedLineupId(userContestLineups[0].id);
      handleLeaveContest();
    }
  };

  const handleLineupSelect = (lineupId: string) => {
    setSelectedLineupId(lineupId);
    setLineupSelectionModal(false);
    handleLeaveContest();
  };

  const handleLeaveContest = async () => {
    try {
      setPendingAction(true);

      // Debug: Log wallet address and deposit status
      console.log("Attempting to withdraw from contest:", {
        contestAddress: contest.address,
        userAddress: userAddress,
        hasDeposited: hasDeposited,
      });

      // Check if user has deposited before attempting withdrawal
      if (!hasDeposited) {
        setSubmissionError(
          `You have not deposited to this contest. Your wallet address: ${userAddress}`
        );
        setPendingAction(false);
        return;
      }

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
      setPendingAction(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Lineup Selection Modal */}
      <Dialog
        open={lineupSelectionModal}
        onClose={() => setLineupSelectionModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-xl shadow-lg">
            <div className="p-6">
              <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
                Select Lineup to Remove
              </Dialog.Title>

              <div className="space-y-2 mb-4">
                {userContestLineups.map((contestLineup) => (
                  <button
                    key={contestLineup.id}
                    onClick={() => handleLineupSelect(contestLineup.id)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">
                      {contestLineup.tournamentLineup?.name || "Unnamed Lineup"}
                    </div>
                    {contestLineup.tournamentLineup?.players && (
                      <div className="text-sm text-gray-500 mt-1">
                        {contestLineup.tournamentLineup.players
                          .map((p) => p.pga_displayName)
                          .join(", ")}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setLineupSelectionModal(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Leave Button */}
      <button
        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
        onClick={handleButtonClick}
        disabled={isSending || isConfirming || userContestLineups.length === 0}
      >
        {isSending || isConfirming ? (
          <div className="flex items-center gap-2 w-full justify-center">
            <LoadingSpinnerSmall />
            {getStatusMessages("idle", isSending, isConfirming)}
          </div>
        ) : (
          `Leave Contest${
            userContestLineups.length > 1 ? ` (${userContestLineups.length} entries)` : ""
          }`
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
