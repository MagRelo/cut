import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

import { CopyButton } from "../components/common/CopyToClipboard";
import { PageHeader } from "../components/common/PageHeader";
import { ShareInviteButton } from "../components/common/ShareInviteButton";
import { PageSection } from "../components/layout/PageSection";
import { UserSettings } from "../components/user/UserSettings";
import { TokenBalances } from "../components/user/TokenBalances";
import { useAuth } from "../contexts/AuthContext";
import { useUserReferralSummary } from "../hooks/useUserReferralSummary";

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

const referralLinkRowGridClass = "grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center";

function ReferralUrlPreview({ url }: { url: string }) {
  return (
    <span
      className="min-w-0 max-w-full truncate text-right font-display text-xs text-gray-800"
      title={url}
    >
      {truncateMiddle(url, 18, 6)}
    </span>
  );
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

  const shareRow = (
    <div className={`${referralLinkRowGridClass}${className ? ` ${className}` : ""}`}>
      <span className="shrink-0 font-display text-sm font-medium text-gray-700">
        Share Your Invite Link
      </span>
      <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
        <ShareInviteButton url={url} ariaLabel="Share your invite link" />
      </div>
    </div>
  );

  const copyRow = (
    <div className={`${referralLinkRowGridClass} mt-3`}>
      <span className="shrink-0 font-display text-sm font-medium text-gray-700">Invite Link</span>
      <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
        <ReferralUrlPreview url={url} />
        <CopyButton text={url} />
      </div>
    </div>
  );

  if (showSeparator) {
    return (
      <div className="mt-4">
        {shareRow}
        {/* {copyRow} */}
      </div>
    );
  }
  return (
    <>
      {shareRow}
      {copyRow}
    </>
  );
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
    <PageSection>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-gray-700">Your Invite Network</h2>
        {loading ? (
          <div className="h-7 w-10 animate-pulse rounded bg-gray-200" aria-busy="true" />
        ) : null}
        {!loading && !error ? (
          <span className="font-display text-lg font-semibold tabular-nums text-gray-800">
            {totalPlayersInNetwork}
          </span>
        ) : null}
      </div>

      <div className="pl-3">
        <p className="mb-3 font-display text-sm text-gray-700">
          When they win, you earn.{" "}
          <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
            Learn more ...
          </Link>
        </p>

        <ReferralLinkRow showSeparator />
      </div>
    </PageSection>
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
    <PageSection>
      <h2 className="mb-3 font-display text-lg font-semibold text-gray-700">Account Information</h2>

      <div className="space-y-3 pl-3">
        {userEmail ? (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
            <span className="shrink-0 font-display text-sm font-medium text-gray-700">Email</span>
            <div className="flex min-w-0 justify-end break-all text-right font-display text-sm text-gray-600">
              {userEmail}
            </div>
          </div>
        ) : null}

        {accountIdAddress ? (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
            <span className="shrink-0 font-display text-sm font-medium text-gray-700">
              Account ID
            </span>
            <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
              <span
                className="truncate text-right font-display text-xs text-gray-800"
                title={accountIdAddress}
              >
                {truncateMiddle(accountIdAddress)}
              </span>
              <CopyButton text={accountIdAddress} />
            </div>
          </div>
        ) : null}
      </div>

      {canSignOut && (
        <div className="mt-4 flex justify-center border-t border-gray-200 pt-4">
          <button
            type="button"
            className="min-w-[120px] rounded border border-blue-500 bg-blue-500 px-4 py-1 font-display text-sm text-white transition-colors hover:bg-blue-600"
            onClick={() => {
              void disconnect();
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </PageSection>
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
    <>
      <PageHeader title="Account Settings" />

      {/* Minting Funds Panel - Only shows when pendingTokenMint flag is set */}
      {/* <MintingUserFundsPanel /> */}

      <TokenBalances showContestHistoryLink={false} />

      <UserSettings />

      <ReferralNetworkPanel
        loading={referralLoading}
        error={referralError}
        levels={referralLevels}
      />

      <WalletInfo
        disconnect={logout}
        canSignOut={!!address || !!smartWalletAddress}
        userEmail={user?.email}
        accountIdAddress={smartWalletAddress}
      />
    </>
  );
}
