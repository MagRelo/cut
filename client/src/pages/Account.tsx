import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

import { CopyButton } from "../components/common/CopyToClipboard";
import { UserSettings } from "../components/user/UserSettings";
import { TokenBalances } from "../components/user/TokenBalances";
import { useAuth } from "../contexts/AuthContext";

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

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
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center mt-2">
          <span className="text-sm font-medium text-gray-700 font-display shrink-0">Email</span>
          <div className="flex min-w-0 justify-end text-gray-600 text-sm font-display break-all text-right">
            {userEmail}
          </div>
        </div>
      ) : null}

      {accountIdAddress ? (
        <div
          className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center ${userEmail ? "mt-3" : ""}`}
        >
          <span className="text-sm font-medium text-gray-700 font-display shrink-0">
            Account ID
          </span>
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
            <span
              className="text-xs text-gray-800 text-right truncate font-display"
              title={accountIdAddress}
            >
              {truncateMiddle(accountIdAddress)}
            </span>
            <CopyButton text={accountIdAddress} />
          </div>
        </div>
      ) : null}

      {inviteLinkUrl ? (
        <div
          className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center ${userEmail || accountIdAddress ? "mt-3" : ""}`}
        >
          <span className="text-sm font-medium text-gray-700 font-display shrink-0">
            Invite Link
          </span>
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
            <span
              className="min-w-0 max-w-full truncate text-xs text-gray-800 text-right font-display"
              title={inviteLinkUrl}
            >
              {truncateMiddle(inviteLinkUrl, 16, 6)}
            </span>
            <CopyButton text={inviteLinkUrl} />
          </div>
        </div>
      ) : null}

      <hr className="my-4 border-gray-200"></hr>

      {canSignOut && (
        <div className={`flex justify-center ${hasWalletRows ? "mt-4" : ""}`}>
          <button
            type="button"
            className="min-w-[120px] bg-white hover:bg-gray-50 text-gray-600 font-display py-1 px-4 rounded border border-gray-300 transition-colors"
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
      {/* <PageHeader title="Account" className="mb-3" /> */}

      {/* Minting Funds Panel - Only shows when pendingTokenMint flag is set */}
      {/* <MintingUserFundsPanel /> */}

      {/* Token Balances */}
      <TokenBalances
        showManageLink={false}
        showCutRow={false}
        showUsdcRow={false}
        showContestHistoryLink={false}
      />

      {/* Wallet Information - Below tabs */}
      <WalletInfo
        disconnect={logout}
        canSignOut={!!address || !!smartWalletAddress}
        userEmail={user?.email}
        accountIdAddress={smartWalletAddress}
        inviteLinkUrl={inviteLinkUrl}
      />

      {/* User Settings */}
      <div className="mt-4">
        <UserSettings />
      </div>
    </div>
  );
}
