import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { PageHeader } from '../components/util/PageHeader';

export function UserPage() {
  const { address, chainId, chain } = useAccount();
  const { connectors, connect, error } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div className='p-4'>
      <PageHeader title='Account' className='mb-3' />

      <div className='bg-white rounded-lg shadow p-4 mb-4'>
        <div className='grid grid-cols-[85px_1fr] gap-2'>
          <div className='font-medium'>Balance:</div>
          <div>892 credits</div>
        </div>

        <div className='mt-4 flex flex-col gap-2'>
          <button
            className='bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
            disabled={true}
            onClick={() => {}}>
            Deposit
          </button>

          {/* <div> status: {status}</div> */}
          <div>{error?.message}</div>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow p-4 mb-4'>
        <div className='text-lg font-bold text-gray-400 mb-2'>Rewards</div>

        <div className='grid grid-cols-[85px_1fr] gap-2'>
          <div className='font-medium'>Refunds:</div>
          <div>224 credits</div>

          <div className='font-medium'>Referrals:</div>
          <div>1116 credits</div>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow p-4 mb-4'>
        <div className='text-lg font-bold text-gray-400 mb-2'>Account</div>
        <div className='grid grid-cols-[85px_1fr] gap-2'>
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
              className='bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
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
