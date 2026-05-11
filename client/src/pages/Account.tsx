import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
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

const referralLinkRowGridClass = "grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center";

function ReferralUrlPreview({ url }: { url: string }) {
  return (
    <span
      className="min-w-0 max-w-full truncate text-xs text-gray-800 text-right font-display"
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
          title: "Play the Cut",
          text: "Join Play the Cut",
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
      className={`inline-flex items-center gap-1.5 shrink-0 rounded px-3 py-1 text-sm font-medium text-white font-display transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
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
      <span className="text-sm font-medium text-gray-700 font-display shrink-0">
        Share Your Link
      </span>
      <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
        <ShareInviteButton url={url} />
      </div>
    </div>
  );

  const copyRow = (
    <div className={`${referralLinkRowGridClass} mt-3`}>
      <span className="text-sm font-medium text-gray-700 font-display shrink-0">Invite Link</span>
      <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
        <ReferralUrlPreview url={url} />
        <CopyButton text={url} />
      </div>
    </div>
  );

  if (showSeparator) {
    return (
      <>
        <hr className="my-4 border-gray-200" />
        {shareRow}
        {/* {copyRow} */}
      </>
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
    <div className="bg-white rounded-sm shadow p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center mb-1">
        <h2 className="text-lg font-semibold text-gray-700 font-display shrink-0">
          Your Invite Network
        </h2>
        {loading ? (
          <div
            className="h-7 w-10 justify-self-end rounded bg-gray-200 animate-pulse"
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
      {loading ? (
        <div className="space-y-2 py-px" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center text-sm font-display"
            >
              <div className="h-5 w-16 rounded bg-gray-200 animate-pulse" />
              <div className="h-5 w-8 justify-self-end rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="space-y-2 py-px">
          {displayLevels.map((level) => (
            <div
              key={level.depth}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center text-sm font-display"
            >
              <span className="text-gray-700 font-medium font-display shrink-0">
                {getDepthLabel(level.depth)}
              </span>
              <span className="text-gray-800 text-right">{level.count}</span>
            </div>
          ))}
        </div>
      ) : null}

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
            className="min-w-0 max-w-full truncate text-xs text-blue-600 hover:text-blue-700 text-right font-display font-normal"
          >
            View contest history...
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

const AdminPanel = () => {
  return (
    <div className="bg-white rounded-sm shadow p-4">
      <h2 className="text-lg font-semibold text-gray-700 font-display mb-3">Admin</h2>
      <div className="flex flex-col gap-2 text-sm">
        <Link to="/admin" className="text-blue-600 hover:text-blue-800 hover:underline">
          Admin Tools
        </Link>
        <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 hover:underline">
          Manage Users
        </Link>
      </div>
    </div>
  );
};

export function UserPage() {
  const { logout, user, isAdmin } = useAuth();
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

      {/* Wallet Information */}
      <WalletInfo
        disconnect={logout}
        canSignOut={!!address || !!smartWalletAddress}
        userEmail={user?.email}
        accountIdAddress={smartWalletAddress}
      />

      {isAdmin() ? <AdminPanel /> : null}
    </div>
  );
}
