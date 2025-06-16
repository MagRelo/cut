import React, { useEffect } from 'react';
import { Contest } from 'src/types.new/contest';
import { useContestApi } from '../../services/contestApi';
import { usePortoAuth } from '../../contexts/PortoAuthContext';

import { decodeEventLog, formatUnits, parseUnits } from 'viem';
import {
  useBalance,
  useAccount,
  useSendCalls,
  useWaitForCallsStatus,
  useChainId,
  useReadContract,
} from 'wagmi';

// Import contract addresses and ABIs
import { paymentTokenAddress } from '../../utils/contracts/sepolia.json';
import PlatformTokenContract from '../../utils/contracts/PlatformToken.json';
import ContestContract from '../../utils/contracts/Contest.json';

interface ContestActionsProps {
  contest: Contest;
  onSuccess: (contest: Contest) => void;
}

export const ContestActions: React.FC<ContestActionsProps> = ({
  contest,
  onSuccess,
}) => {
  const { currentLineup, user } = usePortoAuth();
  const { addLineupToContest, removeLineupFromContest } = useContestApi();
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<
    'join' | 'leave' | null
  >(null);

  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { data: paymentTokenBalance } = useBalance({
    address: userAddress as `0x${string}`,
    token: paymentTokenAddress as `0x${string}`,
    chainId: chainId ?? 0,
  });

  // Define the expected tuple type for details
  type ContestDetailsTuple = [string, bigint, bigint, bigint];

  // Use type assertion when reading the value
  const contestDetailsRaw = useReadContract({
    address: contest.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: 'details',
    args: [],
  }).data as ContestDetailsTuple | undefined;
  const displayFee = formatUnits((contestDetailsRaw as any)?.[1] ?? 0n, 18);

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
    status: confirmationStatus,
    data: confirmationData,
  } = useWaitForCallsStatus({
    id: sendCallsData?.id,
  });

  // find user lineup in contest
  const userContestLineup = contest?.contestLineups?.find(
    (lineup) => lineup.userId === user?.id
  );
  const userInContest = userContestLineup?.userId === user?.id;

  // Effect to handle API call after blockchain confirmation
  useEffect(() => {
    const handleBlockchainConfirmation = async () => {
      if (isConfirmed && pendingAction && sendCallsData?.id) {
        try {
          let updatedContest;
          if (pendingAction === 'join') {
            updatedContest = await addLineupToContest(contest.id, {
              tournamentLineupId: currentLineup?.id ?? '',
            });
          } else if (pendingAction === 'leave') {
            updatedContest = await removeLineupFromContest(
              contest.id,
              userContestLineup?.id ?? ''
            );
          }

          if (updatedContest) {
            onSuccess(updatedContest);
          }
        } catch (err) {
          setError(
            `Failed to ${pendingAction} contest: ${
              err instanceof Error ? err.message : 'Unknown error'
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
    currentLineup?.id,
    userContestLineup?.id,
    addLineupToContest,
    removeLineupFromContest,
    onSuccess,
  ]);

  const handleJoinContest = async () => {
    if (!currentLineup) {
      setError('No tournament lineup found');
      return;
    }
    try {
      setError(null);
      setPendingAction('join');

      console.log('Approving token transfer:', {
        fee: contest.settings?.fee?.toString(),
        amount: parseUnits(contest.settings?.fee?.toString() ?? '0', 18),
      });

      // Execute blockchain transaction with both approval and transfer
      const result = await sendCalls({
        calls: [
          {
            abi: PlatformTokenContract.abi,
            args: [
              contest.address as `0x${string}`,
              parseUnits(contest.settings?.fee?.toString() ?? '0', 18),
            ],
            functionName: 'approve',
            to: paymentTokenAddress as `0x${string}`,
          },
          {
            abi: ContestContract.abi,
            args: [],
            functionName: 'enter',
            to: contest.address as `0x${string}`,
          },
        ],
      });

      console.log('Join contest transaction:', result);
    } catch (err) {
      console.error('Error joining contest:', err);
      setError(
        `Failed to join contest: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      setPendingAction(null);
    }
  };

  const handleLeaveContest = async () => {
    try {
      setError(null);
      setPendingAction('leave');

      // Execute blockchain transaction
      const result = await sendCalls({
        calls: [
          {
            abi: ContestContract.abi,
            args: [],
            functionName: 'leave',
            to: contest.address as `0x${string}`,
          },
        ],
      });

      console.log('Leave contest transaction:', result);
    } catch (err) {
      console.error('Error leaving contest:', err);
      setError(
        `Failed to leave contest: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      setPendingAction(null);
    }
  };

  if (error) {
    return <div className='text-red-500'>{error}</div>;
  }

  return (
    <div className='flex flex-col gap-2'>
      {userInContest ? (
        <button
          className='mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
          onClick={handleLeaveContest}
          disabled={!userInContest || isSending || isConfirming}>
          {isSending || isConfirming ? 'Leaving...' : 'Leave Contest'}
        </button>
      ) : (
        <button
          className='mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
          onClick={handleJoinContest}
          disabled={
            userInContest || !currentLineup || isSending || isConfirming
          }>
          {isSending || isConfirming
            ? 'Joining...'
            : `Join Contest - ${displayFee} ${contest?.settings?.paymentTokenSymbol}`}
        </button>
      )}

      {/* Add status display */}
      <div className='mt-2 text-sm text-gray-600'>
        <div>Transaction Status: {confirmationStatus || 'idle'}</div>
        {sendCallsError && (
          <div className='text-red-500'>
            Send Calls Error: {sendCallsError.message}
          </div>
        )}
        {confirmationError && (
          <div className='text-red-500'>
            Confirmation Error: {confirmationError.message}
          </div>
        )}
      </div>
    </div>
  );
};
