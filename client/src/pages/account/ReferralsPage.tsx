import { Link } from "react-router-dom";
import { ShareInviteButton } from "../../components/common/ShareInviteButton";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { TreeIcon } from "../../components/common/TreeIcon";
import { walletSpecLabelClassName } from "../../components/account/wallet/AssetChips";
import { ReferralTree } from "../../components/account/ReferralTree";
import { useAuth } from "../../contexts/AuthContext";
import {
  useUserReferralSummary,
  type ReferralSummaryNode,
} from "../../hooks/useUserReferralSummary";
import { resolveUserBorderColor } from "../../lib/lineupDisplay";

function formatEarned(amount: number): string {
  if (amount > 0 && amount < 0.01) return "<$0.01";
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ReferralNetworkPanel({
  loading,
  error,
  tree,
  totalEarned,
}: {
  loading: boolean;
  error: string | null;
  tree: ReferralSummaryNode[];
  totalEarned: number;
}) {
  const earnedClass = totalEarned > 0 ? "text-green-700" : "text-gray-900";
  const { user } = useAuth();
  const viewerColor = resolveUserBorderColor(
    typeof user?.settings?.color === "string" ? user.settings.color : undefined,
  );
  const referralUrl = user?.referralCode
    ? `${window.location.origin}/?ref=${user.referralCode}`
    : null;
  const shareButton = referralUrl ? (
    <ShareInviteButton
      url={referralUrl}
      ariaLabel="Share your referral link"
      label="Share Link"
      variant="cta"
    />
  ) : null;

  return (
    <>
      {loading || !error ? (
        <div className="mb-6 max-w-md overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-tl from-slate-100 via-white to-white shadow-md shadow-slate-900/10 ring-1 ring-black/5">
          <div className="px-4 py-4">
            <p className={walletSpecLabelClassName}>Referral Earnings</p>
            {loading ? (
              <div className="mt-1 h-6 w-24 animate-pulse rounded bg-gray-200" aria-busy="true" />
            ) : (
              <p
                className={`mt-1 font-display text-xl font-semibold tabular-nums leading-none ${earnedClass}`}
              >
                {formatEarned(totalEarned)}
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <h2 className="mb-1 font-display text-base font-semibold text-gray-900">
          The Future of Fantasy Sports
        </h2>
        <p className="mb-3 font-display text-sm text-gray-700">
          What makes Play The Cut different? Instead of fees, ads, or sponsors, we’re powered by{" "}
          <b>players supporting players</b>. Invite friends for free, grow your referral tree, and
          earn when your community wins.{" "}
          <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
            Learn how referral earnings work…
          </Link>
        </p>
      </div>

      {/* how it works */}
      <div className="mb-4">
        <h2 className="mb-1 font-display text-base font-semibold text-gray-900">
          Share Your Link!
        </h2>
        <p className="mb-3 font-display text-sm text-gray-700">
          Share your referral link using email, text, or social media. Make sure your friends use
          your referral link to sign up - <b>when they win, you earn</b>:
        </p>
      </div>

      {shareButton ? <div className="my-6 mb-8 flex justify-center">{shareButton}</div> : null}

      <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-gray-900">
        <TreeIcon className="h-5 w-5 shrink-0 text-green-700" aria-hidden />
        Your Network
      </h2>
      <p className="mb-3 font-display text-sm text-gray-700">
        Invite friends and grow your network over time. Whenever these players win a contest,
        referral bonuses flow back to you:
      </p>

      {/* referral tree */}
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-3 shadow-inner ring-1 ring-inset ring-slate-100">
        {!loading && error ? (
          <p className="font-display text-sm text-red-600">{error}</p>
        ) : loading ? (
          <div className="space-y-2 py-1" aria-busy="true">
            <div className="h-10 rounded-sm border border-gray-200 bg-gray-100" />
            <div className="ml-4 space-y-2 border-l border-slate-200 pl-3">
              <div className="h-10 rounded-sm border border-gray-200 bg-gray-100" />
              <div className="h-10 rounded-sm border border-gray-200 bg-gray-50" />
            </div>
          </div>
        ) : (
          <ReferralTree people={tree} viewerColor={viewerColor} shareUrl={referralUrl} />
        )}
      </div>
    </>
  );
}

export function ReferralsPage() {
  const { user } = useAuth();
  const {
    data: referralSummary,
    isLoading: referralLoading,
    error: referralQueryError,
  } = useUserReferralSummary(user?.id);
  const referralError = referralQueryError ? "Could not load referral stats." : null;

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Referral Network" }]}
        className="mb-2"
      />
      <h1 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-gray-900">
        <TreeIcon className="h-6 w-6 shrink-0 text-green-700" aria-hidden />
        Referral Network
      </h1>
      <ReferralNetworkPanel
        loading={referralLoading}
        error={referralError}
        tree={referralSummary?.tree ?? []}
        totalEarned={referralSummary?.totalEarned ?? 0}
      />
    </>
  );
}
