import { useState, useEffect } from 'react';
import { parseEther } from 'viem';
import {
  useBalance,
  useAccount,
  useSendCalls,
  useWaitForCallsStatus,
  useReadContract,
  usePublicClient,
} from 'wagmi';

import { useTournament } from '../../contexts/TournamentContext';
import { type CreateContestInput } from '../../types.new/contest';
import { useContestApi } from '../../services/contestApi';

// contracts
import { paymentTokenAddress } from '../../utils/contracts/sepolia.json';
// import PlatformToken from '../../utils/contracts/PlatformToken.json';
import { contestFactoryAddress } from '../../utils/contracts/sepolia.json';
import ContestFactory from '../../utils/contracts/ContestFactory.json';

export const CreateContestForm = () => {
  const { address: userAddress } = useAccount();
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
  } = useWaitForCallsStatus({
    id: sendCallsData?.id,
  });

  // Add logging for status changes - TEMP
  useEffect(() => {
    console.log('Transaction Status:', {
      isSending,
      isConfirming,
      isConfirmed,
      sendCallsData,
      sendCallsError,
      confirmationError,
      confirmationStatus,
    });
  }, [
    isSending,
    isConfirming,
    isConfirmed,
    sendCallsData,
    sendCallsError,
    confirmationError,
    confirmationStatus,
  ]);

  const { currentTournament } = useTournament();
  const contestApi = useContestApi();

  const paymentTokenBalance = useBalance({
    address: userAddress as `0x${string}`,
    token: paymentTokenAddress as `0x${string}`,
  });

  const [formData, setFormData] = useState<CreateContestInput>({
    name: '',
    description: '',
    tournamentId: '',
    userGroupId: '',
    address: '',
    transactionId: '',
    settings: {
      fee: 10,
      maxEntry: 50,
      contestType: 'PUBLIC',
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingContestData, setPendingContestData] =
    useState<CreateContestInput | null>(null);

  const publicClient = usePublicClient();

  const getAddressFromTransactionId = async (
    transactionId: string
  ): Promise<string> => {
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: transactionId as `0x${string}`,
      });
      if (!receipt?.contractAddress) {
        throw new Error('No contract address found in transaction receipt');
      }
      return receipt.contractAddress;
    } catch (error) {
      console.error('Error getting contract address from transaction:', error);
      throw error;
    }
  };

  // Effect to handle API call after blockchain confirmation
  useEffect(() => {
    const createContestInBackend = async () => {
      if (isConfirmed && pendingContestData && sendCallsData?.id) {
        try {
          console.log('Creating contest in backend with data:', {
            ...pendingContestData,
            transactionId: sendCallsData.id,
            sendCallsData,
          });

          // get address using txn id from sendCallsData
          const contestAddress = await getAddressFromTransactionId(
            sendCallsData.id
          );

          await contestApi.createContest({
            ...pendingContestData,
            transactionId: sendCallsData.id,
            address: contestAddress,
          });

          // Reset form after successful submission
          setFormData({
            name: '',
            description: '',
            tournamentId: '',
            transactionId: '',
            address: '',
            settings: {
              fee: 10,
              maxEntry: 50,
              contestType: 'PUBLIC',
            },
            userGroupId: '',
          });
          setPendingContestData(null);
        } catch (err) {
          console.error('Error creating contest in backend:', err);
          setError('Failed to create contest in backend');
        } finally {
          setLoading(false);
        }
      }
    };

    createContestInBackend();
  }, [isConfirmed, pendingContestData, sendCallsData?.id, contestApi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // get tournament endTIme, add 7 days
      const endTime =
        new Date(currentTournament?.endDate ?? '').getTime() +
        7 * 24 * 60 * 60 * 1000;

      // Store the form data for later use in the API call
      setPendingContestData(formData);

      console.log('Initiating blockchain transaction with data:', {
        name: formData.name,
        fee: formData.settings?.fee,
        maxEntry: formData.settings?.maxEntry,
        endTime,
        oracle: import.meta.env.VITE_ORACLE_ADDRESS,
        hasABI: !!ContestFactory.abi,
      });

      // Execute blockchain transaction
      const result = sendCalls({
        calls: [
          {
            abi: ContestFactory.abi,
            args: [
              formData.name,
              formData.settings?.fee?.toString() ?? '0',
              formData.settings?.maxEntry?.toString() ?? '0',
              endTime.toString(),
              import.meta.env.VITE_ORACLE_ADDRESS as `0x${string}`,
            ],
            functionName: 'createContest',
            to: contestFactoryAddress as `0x${string}`,
          },
        ],
      });

      console.log('Send calls result:', result);
    } catch (err) {
      console.error('Error initiating blockchain transaction:', err);
      setError('Failed to initiate blockchain transaction');
      setLoading(false);
      setPendingContestData(null);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-2 max-w-2xl mx-auto p-4'>
      <div className='space-y-2'>
        <label htmlFor='name' className='block font-medium'>
          Contest Name
        </label>
        <input
          type='text'
          id='name'
          name='name'
          value={formData.name}
          onChange={handleChange}
          required
          className='w-full p-2 border rounded-md'
        />
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <label htmlFor='settings.maxEntry' className='block font-medium'>
            Maximum Entries
          </label>
          <input
            type='number'
            id='settings.maxEntry'
            name='settings.maxEntry'
            value={formData.settings?.maxEntry ?? 0}
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                settings: {
                  maxEntry: Number(e.target.value),
                  fee: prev.settings?.fee ?? 0,
                  contestType: prev.settings?.contestType ?? 'PUBLIC',
                },
              }));
            }}
            min='0'
            required
            className='w-full p-2 border rounded-md'
          />
        </div>

        <div className='space-y-2'>
          <label htmlFor='settings.fee' className='block font-medium'>
            Entry Fee
          </label>
          <div className='relative'>
            <input
              type='number'
              id='settings.fee'
              name='settings.fee'
              value={formData.settings?.fee ?? 0}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  settings: {
                    fee: Number(e.target.value),
                    maxEntry: prev.settings?.maxEntry ?? 0,
                    contestType: prev.settings?.contestType ?? 'PUBLIC',
                  },
                }));
              }}
              min='0'
              step='0.01'
              required
              className='w-full p-2 border rounded-md pr-12'
            />
            <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500'>
              {paymentTokenBalance?.data?.symbol}
            </div>
          </div>
        </div>
      </div>

      <div>
        <button
          type='submit'
          disabled={loading || isSending || isConfirming}
          className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed mt-2'>
          {loading || isSending || isConfirming
            ? 'Creating...'
            : 'Create Contest'}
        </button>
      </div>

      {error && (
        <div className='text-red-500 mb-4'>
          <hr className='my-2' />
          <div className='text-red-500'>{error}</div>
        </div>
      )}

      {/* Add status display */}
      <div className='mt-4 text-sm text-gray-600'>
        <div>Transaction Status: {confirmationStatus || 'idle'}</div>
        {sendCallsError && (
          <div className='text-red-500'>
            Transaction Error: {sendCallsError.message}
          </div>
        )}
        {confirmationError && (
          <div className='text-red-500'>
            Confirmation Error: {confirmationError.message}
          </div>
        )}
      </div>
    </form>
  );
};
