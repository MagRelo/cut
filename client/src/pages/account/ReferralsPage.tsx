import { Link } from "react-router-dom";
import { CopyButton } from "../../components/common/CopyToClipboard";
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
  const referralUrl = user?.referralCode
    ? `${window.location.origin}/?ref=${user.referralCode}`
    : null;

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
          {referralUrl ? (
            <div className="border-t border-slate-100 bg-white/70">
              <p className={`${walletSpecLabelClassName} px-4 pt-3`}>Referral Link:</p>
              <div className="grid grid-cols-2 gap-2 p-3 pt-2">
                <CopyButton text={referralUrl} variant="secondary" idleLabel="Copy Link" />
                <ShareInviteButton
                  url={referralUrl}
                  ariaLabel="Share your referral link"
                  label="Share Link"
                  variant="success"
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-gray-900">
        <TreeIcon className="h-5 w-5 shrink-0 text-green-700" aria-hidden />
        Your Referral Network
      </h2>
      <p className="mb-3 font-display text-sm text-gray-700">
        Play The Cut has integrated referral rewards into the contests in order to turbocharge
        growth. Play in contests with referral rewards and when your friends win, you win.{" "}
        <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
          Learn how referral earnings work…
        </Link>
      </p>

      {/* referral tree */}
      <div className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-4 shadow-inner ring-1 ring-inset ring-slate-100">
        {!loading && error ? (
          <p className="font-display text-sm text-red-600">{error}</p>
        ) : loading ? (
          <div aria-busy="true">
            <div className="flex w-6 -translate-x-[10px] flex-col items-center">
              <span className="h-6 w-6 rounded-full border border-gray-200 bg-white" />
              <span className="h-2 w-px bg-slate-300" />
            </div>
            <div className="relative pl-4">
              <div className="h-10 rounded-sm border border-gray-200 bg-gray-100" />
            </div>
          </div>
        ) : (
          <ReferralTree people={tree} shareUrl={referralUrl} />
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
      <Breadcrumbs items={[{ label: "Referral Network" }]} className="mb-2" />
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
