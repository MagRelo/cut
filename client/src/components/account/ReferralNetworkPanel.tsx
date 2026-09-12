import type { ReactNode } from "react";
import { CopyButton } from "../common/CopyToClipboard";
import { ShareInviteButton } from "../common/ShareInviteButton";
import { walletSpecLabelClassName } from "./wallet/AssetChips";
import { ReferralTree } from "./ReferralTree";
import { useAuth } from "../../contexts/AuthContext";
import {
  useUserReferralSummary,
  type ReferralSummaryNode,
} from "../../hooks/useUserReferralSummary";
import { formatReferralEarned } from "../../lib/formatReferralEarned";

const cardClassName =
  "max-w-md overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-tl from-slate-100 via-white to-white shadow-md shadow-slate-900/10 ring-1 ring-black/5";

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={`${walletSpecLabelClassName} px-4 pt-3`}>{children}</p>;
}

function EarningsSection({ loading, totalEarned }: { loading: boolean; totalEarned: number }) {
  const earnedClass = totalEarned > 0 ? "text-green-700" : "text-gray-900";

  return (
    <div className="px-4 py-4">
      <p className={walletSpecLabelClassName}>lifetime Referral Rewards</p>
      {loading ? (
        <div className="mt-1 h-6 w-24 animate-pulse rounded bg-gray-200" aria-busy="true" />
      ) : (
        <p
          className={`mt-2 font-display text-xl font-semibold tabular-nums leading-none ${earnedClass}`}
        >
          {formatReferralEarned(totalEarned)}
        </p>
      )}

      <p className="mt-2 text-xs italic text-gray-700">Paid to your wallet</p>
    </div>
  );
}

function LinkSection({ url }: { url: string }) {
  return (
    <div className="border-t border-slate-100 bg-white/70">
      <SectionLabel>Your Referral Link</SectionLabel>
      <div className="grid grid-cols-2 gap-2 p-3 pt-2">
        <CopyButton text={url} variant="secondary" idleLabel="Copy" />
        <ShareInviteButton
          url={url}
          ariaLabel="Share your referral link"
          label="Share"
          variant="success"
        />
      </div>
    </div>
  );
}

function TreeSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex w-6 -translate-x-[10px] flex-col items-center">
        <span className="h-6 w-6 rounded-full border border-gray-200 bg-white" />
        <span className="h-2 w-px bg-slate-300" />
      </div>
      <div className="relative pl-4">
        <div className="h-10 rounded-sm border border-gray-200 bg-gray-100" />
      </div>
    </div>
  );
}

function NetworkSection({
  loading,
  error,
  tree,
  shareUrl,
}: {
  loading: boolean;
  error: string | null;
  tree: ReferralSummaryNode[];
  shareUrl: string | null;
}) {
  return (
    <div className="border-t border-slate-100 bg-slate-50 pb-6">
      <SectionLabel>Your Referral Network</SectionLabel>
      <div className="pl-8 pr-6 pt-2">
        {!loading && error ? (
          <p className="font-display text-sm text-red-600">{error}</p>
        ) : loading ? (
          <TreeSkeleton />
        ) : (
          <ReferralTree people={tree} shareUrl={shareUrl} />
        )}
      </div>
    </div>
  );
}

export type ReferralNetworkPanelViewProps = {
  loading?: boolean;
  error?: string | null;
  tree?: ReferralSummaryNode[];
  totalEarned?: number;
  referralUrl?: string | null;
};

export function ReferralNetworkPanelView({
  loading = false,
  error = null,
  tree = [],
  totalEarned = 0,
  referralUrl = null,
}: ReferralNetworkPanelViewProps) {
  return (
    <div className={cardClassName}>
      <EarningsSection loading={loading} totalEarned={totalEarned} />
      {referralUrl ? <LinkSection url={referralUrl} /> : null}
      <NetworkSection loading={loading} error={error} tree={tree} shareUrl={referralUrl} />
    </div>
  );
}

export function ReferralNetworkPanel() {
  const { user } = useAuth();
  const { data, isLoading, error } = useUserReferralSummary(user?.id);
  const referralUrl = user?.referralCode
    ? `${window.location.origin}/?ref=${user.referralCode}`
    : null;

  return (
    <ReferralNetworkPanelView
      loading={isLoading}
      error={error ? "Could not load referral stats." : null}
      tree={data?.tree ?? []}
      totalEarned={data?.totalEarned ?? 0}
      referralUrl={referralUrl}
    />
  );
}
