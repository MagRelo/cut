import { useMemo } from "react";
import { formatUnits } from "viem";
import type { OnchainPaymentView } from "../../types/contest";
import {
  ContestPayoutGradientMoney,
  ContestPayoutRowSubtitle,
  ContestPayoutRowTitle,
} from "./contestPayoutPresentation";

interface ReferralRewardsTreeProps {
  referralPayments: OnchainPaymentView[];
  paymentDecimals: number;
}

interface ReferralNode {
  payment: OnchainPaymentView;
  level: number;
  sharePercent: number;
}

interface ReferralGroup {
  winnerLabel: string;
  totalFee: bigint;
  nodes: ReferralNode[];
}

function formatDollarFromWei(valueWei: bigint, decimals: number, fractionDigits = 2) {
  const valueStr = formatUnits(valueWei, decimals);
  const [whole, fraction = ""] = valueStr.split(".");
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fractionDigits <= 0) return wholeWithCommas;
  const fixedFraction = fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits);
  return `$${wholeWithCommas}.${fixedFraction}`;
}

function parseAmountWei(row: OnchainPaymentView): bigint | null {
  try {
    return BigInt(row.amountWei);
  } catch {
    return null;
  }
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function calculateGeometricSharePercent(level: number, totalLevels: number): number {
  if (totalLevels === 1) return 100;
  const ratio = 5 / 3;
  const shares: number[] = [];
  let current = 1;
  for (let i = 0; i < totalLevels; i++) {
    shares.push(current);
    current = current / ratio;
  }
  const totalShares = shares.reduce((a, b) => a + b, 0);
  return (shares[level] / totalShares) * 100;
}

function TreeLevelIndicator({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: level }, (_, i) => (
        <div
          key={i}
          className="h-4 w-0.5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 opacity-40"
        />
      ))}
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white shadow-sm">
        {level + 1}
      </div>
    </div>
  );
}

function TreeConnector({ isLast }: { isLast: boolean }) {
  return (
    <div className="relative ml-2.5 flex h-full w-4">
      <div
        className={`absolute left-0 top-0 w-0.5 bg-gradient-to-b from-emerald-400 to-emerald-500 ${
          isLast ? "h-4" : "h-full"
        }`}
      />
      <div className="absolute left-0 top-4 h-0.5 w-full bg-gradient-to-r from-emerald-500 to-transparent" />
    </div>
  );
}

function ReferralNodeRow({
  node,
  isFirst,
  isLast,
  paymentDecimals,
}: {
  node: ReferralNode;
  isFirst: boolean;
  isLast: boolean;
  paymentDecimals: number;
}) {
  const wei = parseAmountWei(node.payment);
  const shareLabel = node.sharePercent.toFixed(1);

  return (
    <div className="relative flex items-stretch gap-2">
      {!isFirst && (
        <div className="flex w-6 shrink-0 items-stretch py-1">
          <TreeConnector isLast={isLast} />
        </div>
      )}
      <div
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition-all ${
          isFirst
            ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white"
            : "border-gray-200"
        }`}
        style={
          node.payment.userColor
            ? {
                borderLeftColor: node.payment.userColor,
                borderLeftWidth: "4px",
                borderLeftStyle: "solid",
              }
            : undefined
        }
      >
        <TreeLevelIndicator level={node.level} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ContestPayoutRowTitle>{node.payment.username}</ContestPayoutRowTitle>
            {isFirst && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Direct
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <ContestPayoutRowSubtitle>
              Level {node.level + 1} · {shareLabel}% of fee
            </ContestPayoutRowSubtitle>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {wei !== null ? (
            <ContestPayoutGradientMoney>
              {formatDollarFromWei(wei, paymentDecimals)}
            </ContestPayoutGradientMoney>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

function GeometricSplitLegend({ levels }: { levels: number }) {
  const shares = useMemo(() => {
    return Array.from({ length: Math.min(levels, 5) }, (_, i) =>
      calculateGeometricSharePercent(i, levels),
    );
  }, [levels]);

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <svg
          className="h-4 w-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs font-medium text-slate-600">Geometric Split (5:3 ratio)</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {shares.map((share, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{
                background: `linear-gradient(135deg, rgb(16 185 129) ${100 - i * 15}%, rgb(13 148 136) 100%)`,
              }}
            >
              {i + 1}
            </div>
            <span className="text-xs font-medium tabular-nums text-slate-600">
              {share.toFixed(1)}%
            </span>
            {i < shares.length - 1 && <span className="text-slate-400">→</span>}
          </div>
        ))}
        {levels > 5 && <span className="text-xs text-slate-400">...+{levels - 5} more</span>}
      </div>
    </div>
  );
}

function ReferralGroupSection({
  group,
  paymentDecimals,
}: {
  group: ReferralGroup;
  paymentDecimals: number;
}) {
  const totalPayout = group.nodes.reduce((sum, n) => {
    const wei = parseAmountWei(n.payment);
    return wei !== null ? sum + wei : sum;
  }, 0n);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span className="text-sm font-medium text-slate-700">
            Payout chain for {group.winnerLabel}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500">Total:</span>
          <span className="ml-1 font-semibold tabular-nums text-emerald-700">
            {formatDollarFromWei(totalPayout, paymentDecimals)}
          </span>
        </div>
      </div>
      <div className="relative space-y-0 pl-0">
        {group.nodes.map((node, index) => (
          <div key={`${node.payment.walletAddress}-${index}`} className="relative py-1">
            <ReferralNodeRow
              node={node}
              isFirst={index === 0}
              isLast={index === group.nodes.length - 1}
              paymentDecimals={paymentDecimals}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const ReferralRewardsTree: React.FC<ReferralRewardsTreeProps> = ({
  referralPayments,
  paymentDecimals,
}) => {
  const groups = useMemo(() => {
    const groupMap = new Map<string, ReferralNode[]>();

    for (const payment of referralPayments) {
      const meta = payment.metadata ?? {};
      const winner = (meta.winner as string) ?? "unknown";
      const recipientIndex = typeof meta.recipientIndex === "number" ? meta.recipientIndex : 0;

      if (!groupMap.has(winner)) {
        groupMap.set(winner, []);
      }
      groupMap.get(winner)!.push({
        payment,
        level: recipientIndex,
        sharePercent: 0,
      });
    }

    const result: ReferralGroup[] = [];
    for (const [winner, nodes] of groupMap) {
      nodes.sort((a, b) => a.level - b.level);
      const totalLevels = nodes.length;
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].sharePercent = calculateGeometricSharePercent(i, totalLevels);
      }

      const totalFee = nodes.reduce((sum, n) => {
        const wei = parseAmountWei(n.payment);
        return wei !== null ? sum + wei : sum;
      }, 0n);

      const winnerUsername = referralPayments.find(
        (p) => p.walletAddress.toLowerCase() === winner.toLowerCase(),
      )?.username;
      const winnerLabel = winnerUsername ?? truncateAddress(winner);

      result.push({
        winnerLabel,
        totalFee,
        nodes,
      });
    }

    return result;
  }, [referralPayments]);

  if (groups.length === 0) {
    return <p className="pl-2 text-sm text-slate-500">No rewards payouts recorded.</p>;
  }

  const totalLevelsInLargestGroup = Math.max(...groups.map((g) => g.nodes.length));

  return (
    <div className="space-y-4">
      {totalLevelsInLargestGroup > 1 && (
        <GeometricSplitLegend levels={totalLevelsInLargestGroup} />
      )}
      {groups.map((group, index) => (
        <ReferralGroupSection
          key={`${group.winnerLabel}-${index}`}
          group={group}
          paymentDecimals={paymentDecimals}
        />
      ))}
    </div>
  );
};
