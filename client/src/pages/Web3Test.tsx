import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useSendCalls, useWaitForCallsStatus } from 'wagmi';
import { parseEther } from 'viem';

import { exp1Config, expNftConfig } from '../utils/contracts';

export const Web3Test = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const { data, isPending, sendCalls } = useSendCalls();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForCallsStatus({
      id: data?.id,
    });

  const handleTestCall = async () => {
    if (!isConnected) {
      console.log('Please connect your wallet first');
      return;
    }

    try {
      sendCalls({
        calls: [
          {
            abi: exp1Config.abi,
            args: [expNftConfig.address, parseEther('10')],
            functionName: 'approve',
            to: exp1Config.address,
          },
          {
            abi: expNftConfig.abi,
            functionName: 'mint',
            to: expNftConfig.address,
          },
        ],
      });
    } catch (error) {
      console.error('Error sending calls:', error);
    }

    // This is where you can add your test web3 calls
    console.log('Connected address:', address);
  };

  return (
    <div className='p-6 bg-white rounded-lg shadow-md'>
      <h1 className='text-2xl font-bold mb-4'>Web3 Test Page</h1>

      <div className='space-y-4'>
        <div>
          <p className='mb-2'>
            Connection Status: {isConnected ? 'Connected' : 'Disconnected'}
          </p>
          {address && (
            <p className='mb-2'>
              Address: {address.slice(0, 8)}...{address.slice(-4)}
            </p>
          )}
        </div>

        <div className='space-x-4'>
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'>
              Connect Wallet
            </button>
          ) : (
            <>
              <button
                onClick={() => disconnect()}
                className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors'>
                Disconnect
              </button>
              <button
                onClick={handleTestCall}
                className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'>
                {isPending
                  ? 'Check prompt'
                  : isConfirming
                  ? 'Completing purchase'
                  : 'Make Test Call'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className='text-sm text-gray-500 p-4 bg-white rounded-md border border-gray-200 mt-4'>
        Status: {isConfirmed ? 'Confirmed' : 'Not Confirmed'}
      </div>
    </div>
  );
};
