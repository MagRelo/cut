import { useAccount } from "wagmi";
import { Link } from "react-router-dom";

import { CopyToClipboard } from "../components/common/CopyToClipboard";
import { NetworkStatus } from "../components/common/NetworkStatus";
import { TestnetWarning } from "../components/common/ChainWarning";

import { PageHeader } from "../components/common/PageHeader";
import { UserSettings } from "../components/user/UserSettings";
import { TokenBalances } from "../components/user/TokenBalances";
import { MintingUserFundsPanel } from "../components/user/MintingUserFundsPanel";
import { usePortoAuth } from "../contexts/PortoAuthContext";

// Wallet Info Component (below tabs)
const WalletInfo = ({
  address,
  disconnect,
}: {
  address: string | undefined;
  disconnect: () => void;
}) => (
  <div className="bg-white rounded-sm shadow p-4 mt-4">
    {/* Header */}
    <div className="text-lg font-semibold text-gray-700 mb-4 font-display">Account Information</div>

    {/* Wallet Info Grid */}
    <div className="space-y-3">
      {/* Address */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
        <span className="text-sm font-medium text-gray-700 font-display">Address</span>
        <div className="flex justify-end text-gray-600 text-sm font-semibold">
          <CopyToClipboard text={address || ""} />
        </div>
      </div>

      {/* Network */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
        <span className="text-sm font-medium text-gray-700 font-display">Network</span>
        <div className="flex justify-end">
          <NetworkStatus />
        </div>
      </div>

      {/* Wallet Provider */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center font-display">
        <span className="text-sm font-medium text-gray-700 ">Wallet</span>
        <div className="flex justify-end">
          <a
            href={`https://id.porto.sh/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 text-sm font-semibold transition-colors inline-flex items-center gap-1"
          >
            Porto Wallet
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
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

export function UserPage() {
  const { logout } = usePortoAuth();
  const { address } = useAccount();

  return (
    <div className="p-4">
      <PageHeader title="Account" className="mb-3" />

      {/* Testnet Warning */}
      <TestnetWarning />

      {/* Minting Funds Panel - Only shows when pendingTokenMint flag is set */}
      <MintingUserFundsPanel />

      {/* Token Balances */}
      <TokenBalances showManageLink={false} showCutTokenLink={true} showUsdcLink={true} />

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

      {/* User Settings */}
      <div className="mt-4">
        <UserSettings />
      </div>

      {/* Wallet Information - Below tabs */}
      <WalletInfo address={address} disconnect={logout} />
    </div>
  );
}
