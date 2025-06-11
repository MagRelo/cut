import { useAccount, useDisconnect, useConnect, useBalance } from 'wagmi';
import { PageHeader } from '../components/util/PageHeader';
import { formatEther } from 'viem';

export function UserPage() {
  const { address, chainId, chain } = useAccount();
  const { connectors, connect, error } = useConnect();
  const { disconnect } = useDisconnect();

  // get eth balance
  const { data: balance } = useBalance({
    address: address,
    chainId: chainId ? (chainId as 84532) : undefined,
  });

  return (
    <div className='p-4'>
      <PageHeader title='Account' className='mb-3' />

      <div className='bg-white rounded-lg shadow p-4 mb-4'>
        <div className='text-lg font-semibold text-gray-700 mb-2 font-display'>
          Credits
        </div>

        <div className='grid grid-cols-[85px_1fr] gap-2'>
          <div className='font-medium'>Available:</div>
          <div>892 CUT</div>
        </div>

        <div className='mt-4 flex flex-col gap-2 mb-4'>
          <button
            className='bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
            disabled={true}
            onClick={() => {}}>
            Get Credits
          </button>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow p-4 mb-4'>
        <div className='text-lg font-semibold text-gray-700 mb-2 font-display'>
          Rewards Earned
        </div>

        <div className='grid grid-cols-[85px_1fr] gap-2'>
          <div className='font-medium'>Refunds:</div>
          <div>224 CUT</div>

          <div className='font-medium'>Referrals:</div>
          <div>1116 CUT</div>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow p-4 mb-4'>
        <div className='text-lg font-semibold text-gray-700 mb-2 font-display'>
          Account
        </div>

        <div className='grid grid-cols-[85px_1fr] gap-2'>
          <div className='font-medium'>Balance:</div>
          <div>{formatEther(balance?.value || 0n)} ETH</div>

          <div className='font-medium'>Wallet:</div>
          <div>
            <a
              href={`https://stg.id.porto.sh/`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-500 hover:text-blue-600'>
              <div className='flex items-center gap-1'>
                Porto Wallet
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-4 w-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                  />
                </svg>
              </div>
            </a>
          </div>

          <div className='font-medium'>Address:</div>
          <div>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>

          <div className='font-medium'>Chain:</div>
          <div>{chain?.name}</div>

          <div className='font-medium'>Chain ID:</div>
          <div>{chainId}</div>
        </div>

        <div className='mt-4 flex flex-col gap-2'>
          {!address && (
            <>
              {connectors.map((connector) => (
                <button
                  className='bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
                  disabled={!!address}
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  type='button'>
                  Connect
                </button>
              ))}
            </>
          )}

          {!!address && (
            <button
              className='bg-gray-50 py-2 px-4 rounded disabled:opacity-50 border border-gray-300 text-gray-500 font-medium'
              disabled={!address}
              onClick={() => disconnect()}>
              Sign out
            </button>
          )}

          {/* <div> status: {status}</div> */}
          <div>{error?.message}</div>
        </div>
      </div>
    </div>
  );
}
