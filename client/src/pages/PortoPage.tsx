import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { PageHeader } from '../components/util/PageHeader';

export function PortoPage() {
  const { address, chainId, chain } = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div className='p-4'>
      <PageHeader title='Porto' />

      <div>
        <h2 className='text-2xl font-bold mb-4'>Connect</h2>
        {connectors.map((connector) => (
          <button
            className='bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
            disabled={!!address}
            key={connector.uid}
            onClick={() => connect({ connector })}
            type='button'>
            {connector.name}
          </button>
        ))}

        <button
          className='bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
          disabled={!address}
          onClick={() => disconnect()}>
          Sign out
        </button>
        <div> status: {status}</div>
        <div>{error?.message}</div>
      </div>

      <div>
        <h2 className='text-2xl font-bold mb-4'>Account</h2>
        <div>chain: {chain?.name}</div>
        <div>chainId: {chainId}</div>
        <div>
          address: {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
      </div>
    </div>
  );
}
