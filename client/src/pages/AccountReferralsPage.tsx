import { useMemo } from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { CopyButton } from "../components/common/CopyToClipboard";
import { ShareInviteButton } from "../components/common/ShareInviteButton";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { useAuth } from "../contexts/AuthContext";
import { useUserReferralSummary } from "../hooks/useUserReferralSummary";
import { LEAGUE_STARTER_GUIDE_PATH } from "./LeagueStarterGuidePage";

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
  const { user } = useAuth();
  const code = user?.referralCode;
  const url = code ? `${window.location.origin}/?ref=${code}` : null;
  if (!url) return null;

  const shareRow = (
    <div className={`${referralLinkRowGridClass}${className ? ` ${className}` : ""}`}>
      <span className="shrink-0 font-display text-sm font-medium text-gray-700">
        Share Your Referral Link
      </span>
      <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
        <ShareInviteButton url={url} ariaLabel="Share your referral link" />
      </div>
    </div>
  );

  const copyRow = (
    <div className={`${referralLinkRowGridClass} mt-3`}>
      <span className="shrink-0 font-display text-sm font-medium text-gray-700">Referral Link</span>
      <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
        <ReferralUrlPreview url={url} />
        <CopyButton text={url} />
      </div>
    </div>
  );

  if (showSeparator) {
    return (
      <div className="my-4 flex justify-center">
        <ShareInviteButton
          url={url}
          ariaLabel="Share your referral link"
          label="Share Your Referral Link"
          variant="cta"
        />
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

function ReferralNetworkPanel({
  loading,
  error,
  levels,
}: {
  loading: boolean;
  error: string | null;
  levels: Array<{ depth: number; count: number }> | undefined;
}) {
  const displayLevels = referralDisplayLevels(levels);

  return (
    <>
      <p className="mb-3 font-display text-sm text-gray-700">
        When your friends win, you earn.{" "}
        <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
          Learn more ...
        </Link>
      </p>

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
        <div className="border-t border-gray-200 bg-gray-50 px-3 py-3 font-display">
          <div className="flex gap-2 text-sm text-gray-700">
            <span className="shrink-0" aria-hidden>
              💡
            </span>
            <p className="leading-relaxed">
              <span className="font-medium text-gray-900">Tip:</span> Referrals can be used to fund
              a league.{" "}
              <Link to={LEAGUE_STARTER_GUIDE_PATH} className="text-blue-600 hover:underline">
                Learn more ...
              </Link>
            </p>
          </div>
        </div>
      </div>

      <ReferralLinkRow showSeparator />
    </>
  );
}

export function AccountReferralsPage() {
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
      />
    </>
  );
}
