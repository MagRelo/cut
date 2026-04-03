import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

import { CopyToClipboard } from "../components/common/CopyToClipboard";
import { NetworkStatus } from "../components/common/NetworkStatus";

import { PageHeader } from "../components/common/PageHeader";
import { UserSettings } from "../components/user/UserSettings";
import { TokenBalances } from "../components/user/TokenBalances";
import { MintingUserFundsPanel } from "../components/user/MintingUserFundsPanel";
import { useAuth } from "../contexts/AuthContext";

function addressesEqual(a: string | undefined, b: string | undefined): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

// Wallet Info Component (below tabs)
const WalletInfo = ({
  address,
  smartWalletAddress,
  disconnect,
}: {
  address: string | undefined;
  smartWalletAddress: string | undefined;
  disconnect: () => void;
}) => {
  const showBoth = !!smartWalletAddress && !addressesEqual(address, smartWalletAddress);

  return (
  <div className="bg-white rounded-sm shadow p-4 mt-4">
    {/* Header */}
    <div className="text-lg font-semibold text-gray-700 mb-4 font-display">Account Information</div>

    {/* Wallet Info Grid */}
    <div className="space-y-3">
      {showBoth ? (
        <>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
            <span className="text-sm font-medium text-gray-700 font-display">Smart wallet</span>
            <div className="flex justify-end text-gray-600 text-sm font-semibold">
              <CopyToClipboard text={smartWalletAddress || ""} />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            USDC and CUT balances above apply to this address. Fund this address for in-app purchases.
          </p>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
            <span className="text-sm font-medium text-gray-700 font-display">Signer (EOA)</span>
            <div className="flex justify-end text-gray-600 text-sm font-semibold">
              <CopyToClipboard text={address || ""} />
            </div>
          </div>
        </>
      ) : (
      <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
        <span className="text-sm font-medium text-gray-700 font-display">Address</span>
        <div className="flex justify-end text-gray-600 text-sm font-semibold">
          <CopyToClipboard text={address || ""} />
        </div>
      </div>
      )}

      {/* Network */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
        <span className="text-sm font-medium text-gray-700 font-display">Network</span>
        <div className="flex justify-end">
          <NetworkStatus />
        </div>
      </div>
    </div>

    {/* Sign Out Button */}
    {!!address && (
      <>
        <hr className="my-4 border-gray-200" />
        <div className="flex justify-center">
          <button
            className="min-w-[120px] bg-white hover:bg-gray-50 text-gray-600 font-display py-2 px-4 rounded border border-gray-300 transition-colors disabled:opacity-50"
            disabled={!address}
            onClick={() => {
              disconnect();
            }}
          >
            Sign Out
          </button>
        </div>
      </>
    )}
  </div>
  );
};

export function UserPage() {
  const { logout } = useAuth();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const smartWalletAddress = smartWalletClient?.account?.address;

  return (
    <div className="p-4">
      <PageHeader title="Account" className="mb-3" />

      {/* Minting Funds Panel - Only shows when pendingTokenMint flag is set */}
      <MintingUserFundsPanel />

      {/* Token Balances */}
      <TokenBalances showManageLink={false} showCutTokenLink={true} showUsdcLink={true} />

      {/* User Settings */}
      <div className="mt-4">
        <UserSettings />
      </div>

      {/* User Groups Link */}
      <div className="bg-white rounded-sm shadow p-4 mt-4">
        {/* Header */}
        <div className="text-lg font-semibold text-gray-700 font-display">User Groups</div>

        <Link
          to="/user-groups"
          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">View and manage your user groups</div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Contest History Link */}
      <div className="bg-white rounded-sm shadow p-4 mt-4">
        {/* Header */}
        <div className="text-lg font-semibold text-gray-700 font-display">Contest History</div>

        <Link
          to="/account/history"
          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">View all contests you've participated in</div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Wallet Information - Below tabs */}
      <WalletInfo
        address={address}
        smartWalletAddress={smartWalletAddress}
        disconnect={logout}
      />
    </div>
  );
}
