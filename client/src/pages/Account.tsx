import { useAccount } from "wagmi";

import { CopyToClipboard } from "../components/common/CopyToClipboard";
import { NetworkStatus } from "../components/common/NetworkStatus";
import { TestnetWarning } from "../components/common/ChainWarning";

import { PageHeader } from "../components/common/PageHeader";
import { UserSettings } from "../components/user/UserSettings";
import { TokenBalances } from "../components/user/TokenBalances";
import { usePortoAuth } from "../contexts/PortoAuthContext";

// Wallet Info Component (below tabs)
const WalletInfo = ({
  address,
  disconnect,
}: {
  address: string | undefined;
  disconnect: () => void;
}) => (
  <div className="bg-white rounded-lg shadow p-4 mt-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Connected Wallet</h3>
    </div>

    <div className="space-y-3">
      {/* Wallet */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">Wallet:</span>
        <a
          href={`https://id.porto.sh/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
        >
          Porto Wallet →
        </a>
      </div>

      {/* Address */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">Address:</span>
        <CopyToClipboard
          text={address || ""}
          displayText={`${address?.slice(0, 6)}...${address?.slice(-4)}`}
        />
      </div>

      {/* Network */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">Network:</span>
        <NetworkStatus />
      </div>
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
);

export function UserPage() {
  const { logout } = usePortoAuth();
  const { address } = useAccount();

  return (
    <div className="p-4">
      <PageHeader title="Account" className="mb-3" />

      {/* Testnet Warning */}
      <TestnetWarning />

      {/* Token Balances */}
      <TokenBalances showManageLink={false} showCutTokenLink={true} showUsdcLink={true} />

      {/* User Settings */}
      <UserSettings />

      {/* Wallet Information - Below tabs */}
      <WalletInfo address={address} disconnect={logout} />
    </div>
  );
}
