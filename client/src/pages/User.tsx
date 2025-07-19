import { useState } from "react";
import { useAccount, useDisconnect, useConnectors, useBalance } from "wagmi";
import { Hooks } from "porto/wagmi";
import { formatUnits } from "viem";

import { usePortoAuth } from "../contexts/PortoAuthContext";

import { PageHeader } from "../components/util/PageHeader";
import { CopyToClipboard } from "../components/util/CopyToClipboard";
import { UserSettings } from "../components/user/UserSettings";
import { paymentTokenAddress } from "../utils/contracts/sepolia.json";
import { Transfer } from "../components/user/Transfer";
import { CutAmountDisplay } from "../components/common/CutAmountDisplay";
import { LoadingSpinnerSmall } from "../components/common/LoadingSpinnerSmall";

enum ConnectionStatus {
  IDLE = "idle",
  CONNECTING_WALLET = "connecting_wallet",
  CONNECTING_TO_CUT = "connecting_to_cut",
  SUCCESS = "success",
  ERROR = "error",
}

export function UserPage() {
  const { user } = usePortoAuth();
  const { address, chainId, chain } = useAccount();

  const [connector] = useConnectors();
  const { mutate: connect, error } = Hooks.useConnect();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const { disconnect } = useDisconnect();

  // Helper function to get status display text
  const getStatusText = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTING_WALLET:
        return "Connecting wallet...";
      case ConnectionStatus.CONNECTING_TO_CUT:
        return "Connecting to the Cut...";
      case ConnectionStatus.SUCCESS:
        return "Connected successfully!";
      case ConnectionStatus.ERROR:
        return "Connection failed";
      default:
        return "";
    }
  };

  // Helper function to check if connecting
  const isConnecting =
    connectionStatus === ConnectionStatus.CONNECTING_WALLET ||
    connectionStatus === ConnectionStatus.CONNECTING_TO_CUT;

  // paymentTokenAddress balance
  const { data: paymentTokenBalance } = useBalance({
    address: address,
    token: paymentTokenAddress as `0x${string}`,
  });
  // round balance to 2 decimal points
  const formattedBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 18)).toFixed(2);
  };

  if (!user) {
    return (
      <div className="p-4">
        <PageHeader title="Account" className="mb-3" />

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="text-lg font-semibold text-gray-700 mb-2 font-display">Account</div>

          <div className="flex flex-col gap-2">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
              disabled={isConnecting}
              key={connector.uid}
              onClick={async () => {
                setConnectionStatus(ConnectionStatus.CONNECTING_WALLET);
                await connect(
                  {
                    connector,
                    signInWithEthereum: {
                      authUrl: import.meta.env.VITE_API_URL + "/auth/siwe",
                    },
                  },
                  {
                    onSuccess: () => {
                      setConnectionStatus(ConnectionStatus.CONNECTING_TO_CUT);
                    },
                    onError: (error) => {
                      console.log(error);
                      setConnectionStatus(ConnectionStatus.ERROR);
                    },
                  }
                );
              }}
              type="button"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          </div>

          {/* Add status display */}
          <div className="mt-2 text-sm text-center">
            {/* Connecting display */}
            {isConnecting && (
              <div className="flex items-center gap-2 w-full justify-center text-gray-600">
                <LoadingSpinnerSmall color={"green"} />
                {getStatusText()}
              </div>
            )}

            {/* Error display */}
            {connectionStatus === ConnectionStatus.ERROR && (
              <div className="text-red-500">Connection failed</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader title="Account" className="mb-3" />

      {/* Account Settings */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <div className="text-lg font-semibold text-gray-700 mb-2 font-display">
            Available Balance
          </div>

          <CutAmountDisplay
            amount={Number(formattedBalance(paymentTokenBalance?.value ?? 0n))}
            label="BTCUT"
            logoPosition="right"
          />
        </div>

        <div className="">
          {/* TODO: Add funding */}
          <div className="mt-4 flex justify-center">
            <a
              href={`https://stg.id.porto.sh/`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded inline-flex items-center gap-1 min-w-fit justify-center"
            >
              Add Funds
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          {error && (
            <>
              <hr className="my-2" />
              <div>{error?.message}</div>
            </>
          )}
        </div>
      </div>

      {/* User Settings */}
      <UserSettings />

      {/* Rewards Earned */}
      {/* <div className='bg-white rounded-lg shadow p-4 mb-4'>
        <div className='text-lg font-semibold text-gray-700 mb-2 font-display'>
          Rewards Earned
        </div>

        <div className='grid grid-cols-[85px_1fr] gap-2'>
          <div className='font-medium'>Refunds:</div>
          <div>0 CUT</div>

          <div className='font-medium'>Referrals:</div>
          <div>0 CUT</div>
        </div>
      </div> */}

      {/* Transfer */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 mb-2 font-display">
          User-to-User Transfer
        </div>

        <Transfer />
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 mb-2 font-display">Wallet</div>

        <div className="grid grid-cols-[100px_1fr] gap-2">
          {/* ETH Balance */}
          {/* <div className='font-medium'>Balance:</div>
          <div>{formatEther(balance?.value || 0n)} ETH</div> */}

          {/* Porto Wallet */}
          <div className="font-medium">Wallet:</div>
          <div>
            <a
              href={`https://stg.id.porto.sh/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              <div className="flex items-center gap-1">
                Porto Wallet
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
            </a>
          </div>

          {/* Address */}
          <div className="font-medium">Address:</div>

          <div>
            <CopyToClipboard
              text={address || ""}
              displayText={`${address?.slice(0, 6)}...${address?.slice(-4)}`}
            />
          </div>

          {/* Chain */}
          <div className="font-medium">Chain:</div>
          <div>{chain?.name}</div>

          {/* Chain ID */}
          <div className="font-medium">Chain ID:</div>
          <div>{chainId}</div>
        </div>

        <div className="">
          <hr className="my-2" />

          {!!address && (
            <button
              className="bg-gray-50 py-1 px-4 mt-4 rounded disabled:opacity-50 border border-gray-300 text-gray-500 font-medium min-w-fit mx-auto block"
              disabled={!address}
              onClick={() => {
                disconnect();
                setConnectionStatus(ConnectionStatus.IDLE);
              }}
            >
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
