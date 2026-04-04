import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

// import { NetworkStatus } from "../components/common/NetworkStatus";
// import { MintingUserFundsPanel } from "../components/user/MintingUserFundsPanel";

import { PageHeader } from "../components/common/PageHeader";
import { UserSettings } from "../components/user/UserSettings";
import { TokenBalances } from "../components/user/TokenBalances";
import { useAuth } from "../contexts/AuthContext";

// Wallet Info Component (below tabs)
const WalletInfo = ({
  disconnect,
  canSignOut,
}: {
  disconnect: () => void;
  canSignOut: boolean;
}) => {
  return (
    <div className="bg-white rounded-sm shadow p-4 mt-4">
      {/* Sign Out Button */}
      {canSignOut && (
        <>
          <div className="flex justify-center">
            <button
              className="min-w-[120px] bg-white hover:bg-gray-50 text-gray-600 font-display py-2 px-4 rounded border border-gray-300 transition-colors"
              type="button"
              onClick={() => {
                void disconnect();
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

  const inviteLinkUrl = useMemo(
    () =>
      smartWalletAddress
        ? `${window.location.origin}/?ref=${smartWalletAddress}`
        : undefined,
    [smartWalletAddress],
  );

  return (
    <div className="p-4">
      <PageHeader title="Account" className="mb-3" />

      {/* Minting Funds Panel - Only shows when pendingTokenMint flag is set */}
      {/* <MintingUserFundsPanel /> */}

      {/* Token Balances */}
      <TokenBalances
        showManageLink={false}
        showCutRow={false}
        showUsdcRow={false}
        showContestHistoryLink={false}
        accountIdRow={true}
        accountIdAddress={smartWalletAddress ?? ""}
        inviteLinkUrl={inviteLinkUrl}
      />

      {/* User Settings */}
      <div className="mt-4">
        <UserSettings />
      </div>

      {/* Wallet Information - Below tabs */}
      <WalletInfo disconnect={logout} canSignOut={!!address || !!smartWalletAddress} />
    </div>
  );
}
