import { useMemo } from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { ShareInviteButton } from "../../components/common/ShareInviteButton";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { walletSpecLabelClassName } from "../../components/account/wallet/AssetChips";
import { useAuth } from "../../contexts/AuthContext";
import { useUserReferralSummary } from "../../hooks/useUserReferralSummary";
import { LEAGUE_STARTER_GUIDE_PATH } from "../LeagueStarterGuidePage";

const REFERRAL_LEVEL_ROWS = [
  { key: "1", depth: 1, label: "Direct" },
  { key: "2", depth: 2, label: "2nd" },
] as const;

function referralDisplayLevels(
  levels: Array<{ depth: number; count: number }> | undefined,
): Array<{ key: string; label: string; count: number }> {
  const levelsByDepth = new Map((levels ?? []).map((level) => [level.depth, level.count]));
  const rows: Array<{ key: string; label: string; count: number }> = REFERRAL_LEVEL_ROWS.map(
    (row) => ({
      key: row.key,
      label: row.label,
      count: levelsByDepth.get(row.depth) ?? 0,
    }),
  );
  const moreCount = (levels ?? [])
    .filter((level) => level.depth >= 3)
    .reduce((sum, level) => sum + level.count, 0);
  rows.push({ key: "more", label: "3+", count: moreCount });
  return rows;
}

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
  levels,
  totalEarned,
}: {
  loading: boolean;
  error: string | null;
  levels: Array<{ depth: number; count: number }> | undefined;
  totalEarned: number;
}) {
  const displayLevels = referralDisplayLevels(levels);
  const earnedClass = totalEarned > 0 ? "text-green-700" : "text-gray-900";
  const { user } = useAuth();
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
          <b>players supporting players</b>. Invite friends for free, build your referral tree, and
          earn when your community wins.{" "}
          <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
            Learn how to earn using referrals...
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
          your referral link to sign up - when they win, you earn.
        </p>
      </div>

      {shareButton ? <div className="my-6 flex justify-center">{shareButton}</div> : null}

      <h2 className="mb-1 font-display text-base font-semibold text-gray-900">Start a League</h2>
      <p className="mb-3 font-display text-sm text-gray-700">
        Start a league to maximize your referrals.{" "}
        <Link to={LEAGUE_STARTER_GUIDE_PATH} className="text-blue-600 hover:underline">
          Learn how to start a league...
        </Link>
      </p>

      <h2 className="mb-1 font-display text-base font-semibold text-gray-900">
        Your Referral Tree
      </h2>
      <p className="mb-3 font-display text-sm text-gray-700">
        Your referral tree shows how many players you've invited and how many levels deep you are.
      </p>

      {/* referral tree */}
      <div className="overflow-hidden rounded-sm border border-gray-200">
        {!loading && error ? (
          <p className="border-b border-gray-200 px-3 py-2 font-display text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <table className="w-full border-collapse font-display text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Level
              </th>
              <th className="w-[5.5rem] px-3 py-2 text-right text-xs font-semibold uppercase tabular-nums tracking-wide text-slate-600">
                Players
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <tr
                    key={index}
                    className={index > 0 ? "border-t border-slate-100" : undefined}
                    aria-busy="true"
                  >
                    <td className="px-3 py-2.5">
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="ml-auto h-5 w-8 animate-pulse rounded bg-gray-200" />
                    </td>
                  </tr>
                ))
              : null}
            {!loading && !error
              ? displayLevels.map((level, index) => (
                  <tr
                    key={level.key}
                    className={index > 0 ? "border-t border-slate-100" : undefined}
                  >
                    <td className="px-3 py-2.5 text-left text-gray-800">{level.label}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gray-800">
                      {level.count}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-sm border border-gray-200 bg-gray-50 px-3 py-3 font-display">
        <div className="flex gap-2 text-sm text-gray-700">
          <span className="shrink-0" aria-hidden>
            💡
          </span>
          <p className="leading-relaxed">
            <span className="font-medium text-gray-900">Tip:</span> Referrals can be used to fund a
            league.{" "}
            <Link to={LEAGUE_STARTER_GUIDE_PATH} className="text-blue-600 hover:underline">
              Learn more ...
            </Link>
          </p>
        </div>
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
  const referralLevels = useMemo(() => {
    if (!referralSummary?.levels) return [];
    const maxDepth = Math.max(1, referralSummary.maxDepth || 10);
    return referralSummary.levels.filter((level) => level.depth <= maxDepth);
  }, [referralSummary]);
  const referralError = referralQueryError ? "Could not load referral stats." : null;

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Referrals" }]}
        className="mb-2"
      />
      <h1 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-gray-900">
        <UserGroupIcon className="h-6 w-6 shrink-0" aria-hidden />
        Referrals
      </h1>
      <ReferralNetworkPanel
        loading={referralLoading}
        error={referralError}
        levels={referralLevels}
        totalEarned={referralSummary?.totalEarned ?? 0}
      />
    </>
  );
}
