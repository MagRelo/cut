import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

// import { NetworkStatus } from "../components/common/NetworkStatus";
// import { MintingUserFundsPanel } from "../components/user/MintingUserFundsPanel";

import { PageHeader } from "../components/common/PageHeader";
import { CopyToClipboard } from "../components/common/CopyToClipboard";
import { UserSettings } from "../components/user/UserSettings";
import { TokenBalances } from "../components/user/TokenBalances";
import { useAuth } from "../contexts/AuthContext";

// Wallet Info Component (below tabs)
const WalletInfo = ({
  disconnect,
  canSignOut,
  userEmail,
  accountIdAddress,
  inviteLinkUrl,
}: {
  disconnect: () => void;
  canSignOut: boolean;
  userEmail: string | null | undefined;
  accountIdAddress: string | undefined;
  inviteLinkUrl: string | undefined;
}) => {
  const hasWalletRows = Boolean(userEmail || accountIdAddress || inviteLinkUrl);

  return (
    <div className="bg-white rounded-sm shadow p-4 mt-4">
      <h2 className="text-lg font-semibold text-gray-700 font-display mb-3">Account Information</h2>
      {userEmail ? (
        <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
          <span className="text-sm font-medium text-gray-700 font-display">Email</span>
          <div className="flex justify-end text-gray-600 text-sm font-display break-all text-right">
            {userEmail}
          </div>
        </div>
      ) : null}

      {accountIdAddress ? (
        <div
          className={`grid grid-cols-[auto_1fr] gap-x-4 items-center ${userEmail ? "mt-2" : ""}`}
        >
          <span className="text-sm font-medium text-gray-700 font-display">Account ID</span>
          <div className="flex justify-end text-gray-700 text-sm font-medium">
            <CopyToClipboard
              text={accountIdAddress}
              // displayText={<span className="text-gray-700 font-mono text-xs">(click to copy)</span>}
            />
          </div>
        </div>
      ) : null}

      {inviteLinkUrl ? (
        <div
          className={`grid grid-cols-[auto_1fr] gap-x-4 items-center ${userEmail || accountIdAddress ? "mt-2" : ""}`}
        >
          <span className="text-sm font-medium text-gray-700 font-display">Invite Link</span>
          <div className="flex justify-end text-gray-700 text-sm font-medium">
            <CopyToClipboard
              text={inviteLinkUrl}
              // displayText={<span className="text-gray-700 font-mono text-xs">(click to copy)</span>}
            />
          </div>
        </div>
      ) : null}

      <hr className="my-4 border-gray-200"></hr>

      {canSignOut && (
        <div className={`flex justify-center ${hasWalletRows ? "mt-4" : ""}`}>
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
      )}
    </div>
  );
};

export function UserPage() {
  const { logout, user } = useAuth();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const smartWalletAddress = smartWalletClient?.account?.address;

  const inviteLinkUrl = useMemo(
    () => (smartWalletAddress ? `${window.location.origin}/?ref=${smartWalletAddress}` : undefined),
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
      />

      {/* User Settings */}
      <div className="mt-4">
        <UserSettings />
      </div>

      {/* Wallet Information - Below tabs */}
      <WalletInfo
        disconnect={logout}
        canSignOut={!!address || !!smartWalletAddress}
        userEmail={user?.email}
        accountIdAddress={smartWalletAddress}
        inviteLinkUrl={inviteLinkUrl}
      />
    </div>
  );
}
