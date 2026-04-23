import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

import { CopyButton } from "../components/common/CopyToClipboard";
import { UserSettings } from "../components/user/UserSettings";
import { TokenBalances } from "../components/user/TokenBalances";
import { useAuth } from "../contexts/AuthContext";
import { useUserReferralSummary } from "../hooks/useUserReferralSummary";

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function ReferralLinkRow({
  className,
  showSeparator,
}: {
  className?: string;
  showSeparator?: boolean;
}) {
  const { client: smartWalletClient } = useSmartWallets();
  const addr = smartWalletClient?.account?.address;
  const url = addr ? `${window.location.origin}/?ref=${addr}` : null;
  if (!url) return null;

  const row = (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center${className ? ` ${className}` : ""}`}
    >
      <span className="text-sm font-medium text-gray-700 font-display shrink-0">Invite Link</span>
      <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
        <span
          className="min-w-0 max-w-full truncate text-xs text-gray-800 text-right font-display"
          title={url}
        >
          {truncateMiddle(url, 18, 6)}
        </span>
        <CopyButton text={url} />
      </div>
    </div>
  );

  if (showSeparator) {
    return (
      <>
        <hr className="my-4 border-gray-200" />
        {row}
      </>
    );
  }
  return row;
}

const ReferralNetworkPanel = ({
  loading,
  error,
  levels,
}: {
  loading: boolean;
  error: string | null;
  levels: Array<{ depth: number; count: number }> | undefined;
}) => {
  const totalPlayersInNetwork = (levels ?? []).reduce((sum, level) => sum + level.count, 0);
  return (
    <div className="bg-white rounded-sm shadow p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-700 font-display shrink-0">
          Your Invite Network
        </h2>
        {loading ? (
          <div
            className="h-5 w-10 justify-self-end rounded bg-gray-200 animate-pulse"
            aria-busy="true"
          />
        ) : null}
        {!loading && !error ? (
          <span className="text-lg font-semibold text-gray-800 text-right font-display">
            {totalPlayersInNetwork}
          </span>
        ) : null}
      </div>

      <p className="text-sm text-gray-700 font-display mb-3">
        When they win, you earn.{" "}
        <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
          Learn more ...
        </Link>
      </p>

      {!loading && error ? <p className="text-sm text-red-600 font-display">{error}</p> : null}

      <ReferralLinkRow showSeparator />
    </div>
  );
};

// Wallet Info Component (below tabs)
const WalletInfo = ({
  disconnect,
  canSignOut,
  userEmail,
  accountIdAddress,
}: {
  disconnect: () => void;
  canSignOut: boolean;
  userEmail: string | null | undefined;
  accountIdAddress: string | undefined;
}) => {
  return (
    <div className="bg-white rounded-sm shadow p-4">
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

      <div
        className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center ${userEmail || accountIdAddress ? "mt-3" : ""}`}
      >
        <span className="text-sm font-medium text-gray-700 font-display shrink-0">
          Contest History
        </span>
        <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
          <Link
            to="/account/history"
            className="min-w-0 max-w-full truncate text-xs text-blue-600 hover:underline text-right font-display"
          >
            View contest history &gt;
          </Link>
        </div>
      </div>

      <hr className="my-4 border-gray-200"></hr>

      {canSignOut && (
        <div className="flex justify-center mt-4">
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

  const {
    data: referralSummary,
    isLoading: referralLoading,
    error: referralQueryError,
  } = useUserReferralSummary(user?.id);
  const referralLevels = useMemo(() => {
    if (!referralSummary?.levels) return [];
    const maxDepth = Math.max(1, referralSummary.maxDepth || 10);
    return referralSummary.levels.filter((level) => level.depth <= maxDepth);
  }, [referralSummary]);
  const referralError = referralQueryError ? "Could not load referral stats." : null;

  return (
    <div className="p-4 space-y-4">
      {/* <PageHeader title="Account" className="mb-3" /> */}

      {/* Minting Funds Panel - Only shows when pendingTokenMint flag is set */}
      {/* <MintingUserFundsPanel /> */}

      {/* Token Balances */}
      <TokenBalances
        showCutRow={false}
        showCutInfoLink={false}
        showUsdcRow={false}
        showContestHistoryLink={false}
      />

      <ReferralNetworkPanel
        loading={referralLoading}
        error={referralError}
        levels={referralLevels}
      />

      {/* User Settings */}
      <UserSettings />

      {/* Wallet Information - Below tabs */}
      <WalletInfo
        disconnect={logout}
        canSignOut={!!address || !!smartWalletAddress}
        userEmail={user?.email}
        accountIdAddress={smartWalletAddress}
      />
    </div>
  );
}
