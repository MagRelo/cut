import { useAccount, useBalance, useDisconnect } from "wagmi";
import { formatUnits } from "viem";
import { Link } from "react-router-dom";

import { usePortoAuth } from "../contexts/PortoAuthContext";

import { PageHeader } from "../components/util/PageHeader";
import { CopyToClipboard } from "../components/util/CopyToClipboard";
import { platformTokenAddress, paymentTokenAddress } from "../utils/contracts/sepolia.json";
import { CutAmountDisplay } from "../components/common/CutAmountDisplay";

import { Connect } from "../components/user/Connect";
import { UserSettings } from "../components/user/UserSettings";

export function UserPage() {
  const { user } = usePortoAuth();
  const { address, chainId, chain } = useAccount();
  const { disconnect } = useDisconnect();

  // platformTokenAddress balance
  const { data: platformTokenBalance } = useBalance({
    address: address,
    token: platformTokenAddress as `0x${string}`,
  });

  // paymentTokenAddress balance
  const { data: paymentTokenBalance } = useBalance({
    address: address,
    token: paymentTokenAddress as `0x${string}`,
  });

  // round balance to 2 decimal points for platform tokens (18 decimals)
  const formattedPlatformBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 18)).toFixed(2);
  };

  // round balance to 2 decimal points for payment tokens (6 decimals)
  const formattedPaymentBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 6)).toFixed(2);
  };

  // if user is not connected, show the connect component
  if (!user) {
    return (
      <div className="p-4">
        <PageHeader title="Account" className="mb-3" />
        <Connect />
      </div>
    );
  }

  // if user is connected, show the account settings
  return (
    <div className="p-4">
      <PageHeader title="Account" className="mb-3" />

      {/* Account Settings */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          {/* Available Balance */}
          <div className="text-lg font-semibold text-gray-700 font-display">Balance</div>
          <CutAmountDisplay
            amount={Number(formattedPlatformBalance(platformTokenBalance?.value ?? 0n))}
            label={platformTokenBalance?.symbol}
            logoPosition="right"
          />
        </div>
        <hr className="mt-2 mb-4" />

        {/* Treasury Operations */}
        <div className="flex justify-center gap-2 mb-4">
          <Link
            to="/add"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded inline-flex items-center gap-1"
          >
            Add CUT
          </Link>
          <Link
            to="/sell"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded inline-flex items-center gap-1"
          >
            Sell CUT
          </Link>
          <Link
            to="/transfer"
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded inline-flex items-center gap-1"
          >
            Transfer
          </Link>
        </div>

        {/* Link to treasury */}
        {/* <div className="flex justify-center">
          <Link to="/treasury" className="text-gray-500 hover:text-gray-700">
            View Treasury
          </Link>
        </div> */}
      </div>

      {/* User Settings */}
      <UserSettings />

      {/* Wallet */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-gray-700 mb-2 font-display">Wallet</div>

        <div className="grid grid-cols-[100px_1fr] gap-2">
          {/* Platform Token Balance */}
          <div className="font-medium">CUT</div>
          <div>
            {formattedPlatformBalance(platformTokenBalance?.value ?? 0n)}{" "}
            {platformTokenBalance?.symbol}
          </div>

          {/* Payment Token Balance */}
          <div className="font-medium">USDC</div>
          <div>
            {formattedPaymentBalance(paymentTokenBalance?.value ?? 0n)}{" "}
            {paymentTokenBalance?.symbol}
          </div>

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

        <hr className="my-4" />
        <div className="flex justify-center">
          {!!address && (
            <button
              className="bg-gray-50 py-1 px-4 rounded disabled:opacity-50 border border-gray-300 text-gray-500 font-medium min-w-fit mx-auto block"
              disabled={!address}
              onClick={() => {
                disconnect();
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
