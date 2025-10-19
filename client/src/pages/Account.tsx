import { useAccount } from "wagmi";

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
    <div className="text-lg font-semibold text-gray-700 mb-4 font-display">Connected Wallet</div>

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
      <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
        <span className="text-sm font-medium text-gray-700 font-display">Wallet</span>
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

      {/* Minting Funds Panel */}
      <MintingUserFundsPanel />

      {/* Token Balances */}
      <TokenBalances showManageLink={false} showCutTokenLink={true} showUsdcLink={true} />

      {/* User Settings */}
      <UserSettings />

      {/* Wallet Information - Below tabs */}
      <WalletInfo address={address} disconnect={logout} />
    </div>
  );
}
