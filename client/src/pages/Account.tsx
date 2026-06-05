import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

import { CopyButton } from "../components/common/CopyToClipboard";
import { PageSection } from "../components/layout/PageSection";
import { UserSettings } from "../components/user/UserSettings";
import { TokenBalances } from "../components/user/TokenBalances";
import { useAuth } from "../contexts/AuthContext";
import { useUserReferralSummary } from "../hooks/useUserReferralSummary";
import { BRAND_PROSE } from "../lib/brand";

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

function ShareInviteButton({ url }: { url: string }) {
  const [feedback, setFeedback] = useState<null | "shared" | "copied">(null);

  const handleClick = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: BRAND_PROSE,
          text: `Join ${BRAND_PROSE}`,
          url,
        });
        setFeedback("shared");
        setTimeout(() => setFeedback(null), 2000);
        return;
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("copied");
      setTimeout(() => setFeedback(null), 2000);
    } catch (e) {
      console.error("Share/copy failed:", e);
    }
  };

  const label = feedback === "shared" ? "Shared!" : feedback === "copied" ? "Copied!" : "Share";
  const active = feedback !== null;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      aria-label={active ? label : "Share your invite link"}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded px-3 py-1 font-display text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        active ? "bg-blue-600" : "bg-blue-500 hover:bg-blue-600"
      }`}
    >
      {label}
      <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
    </button>
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
        <ShareInviteButton url={url} />
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
  const getDepthLabel = (depth: number) => {
    if (depth === 1) return "Direct";
    const suffix =
      depth % 10 === 1 && depth % 100 !== 11
        ? "st"
        : depth % 10 === 2 && depth % 100 !== 12
          ? "nd"
          : depth % 10 === 3 && depth % 100 !== 13
            ? "rd"
            : "th";
    return `${depth}${suffix}`;
  };
  const totalPlayersInNetwork = (levels ?? []).reduce((sum, level) => sum + level.count, 0);
  const levelsByDepth = new Map((levels ?? []).map((level) => [level.depth, level.count]));
  const maxDepthToShow = Math.max(3, ...(levels ?? []).map((level) => level.depth));
  const displayLevels = Array.from({ length: maxDepthToShow }, (_, index) => {
    const depth = index + 1;
    return { depth, count: levelsByDepth.get(depth) ?? 0 };
  });
  return (
    <PageSection variant="card">
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

      <p className="mb-3 font-display text-sm text-gray-700">
        When they win, you earn.{" "}
        <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
          Learn more ...
        </Link>
      </p>

      <div className="space-y-3 rounded-sm border border-l-4 border-emerald-200/80 border-l-emerald-600 bg-emerald-50/50 p-4 sm:p-5">
        {!loading && error ? <p className="font-display text-sm text-red-600">{error}</p> : null}
        {loading ? (
          <div className="space-y-2 py-px" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 font-display text-sm"
              >
                <div className="h-5 w-16 animate-pulse rounded bg-emerald-200/60" />
                <div className="h-5 w-8 animate-pulse justify-self-end rounded bg-emerald-200/60" />
              </div>
            ))}
          </div>
        ) : null}
        {!loading && !error ? (
          <div className="space-y-2 py-px">
            {displayLevels.map((level) => (
              <div
                key={level.depth}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 font-display text-sm"
              >
                <span className="shrink-0 font-medium text-gray-700">
                  {getDepthLabel(level.depth)}
                </span>
                <span className="text-right font-semibold tabular-nums text-emerald-900">
                  {level.count}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <ReferralLinkRow showSeparator />
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
    <PageSection variant="card">
      <h2 className="mb-3 font-display text-lg font-semibold text-gray-700">Account Information</h2>

      <div className="space-y-3">
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

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
          <span className="shrink-0 font-display text-sm font-medium text-gray-700">
            Contest History
          </span>
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
            <Link
              to="/account/history"
              className="min-w-0 max-w-full truncate text-right font-display text-sm font-normal text-blue-600 hover:text-blue-700"
            >
              View contest history...
            </Link>
          </div>
        </div>
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
    <div className="-m-4 bg-gray-100 p-4">
      <div className="space-y-5">
        {/* <PageHeader title="Account" className="mb-3" /> */}

        {/* Minting Funds Panel - Only shows when pendingTokenMint flag is set */}
        {/* <MintingUserFundsPanel /> */}

        {/* Token Balances */}
        <TokenBalances showContestHistoryLink={false} />

        <ReferralNetworkPanel
          loading={referralLoading}
          error={referralError}
          levels={referralLevels}
        />

        {/* User Settings */}
        <UserSettings />

        {/* Wallet Information */}
        <WalletInfo
          disconnect={logout}
          canSignOut={!!address || !!smartWalletAddress}
          userEmail={user?.email}
          accountIdAddress={smartWalletAddress}
        />
      </div>
    </div>
  );
}
