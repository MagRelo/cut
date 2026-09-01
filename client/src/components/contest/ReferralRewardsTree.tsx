import { useMemo } from "react";
import type { OnchainPaymentView } from "../../types/contest";
import { formatDollarFromWei, parseAmountWei } from "./contestPayoutFormat";
import {
  ContestPayoutGradientMoney,
  ContestPayoutRow,
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
  id: string;
  nodes: ReferralNode[];
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

function groupReferralPayments(referralPayments: OnchainPaymentView[]): ReferralGroup[] {
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
    result.push({ id: winner, nodes });
  }

  return result;
}

function TreeLevelIndicator({ level }: { level: number }) {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white shadow-sm">
      {level + 1}
    </div>
  );
}

function TreeConnector({ isLast }: { isLast: boolean }) {
  return (
    <div className="relative ml-2.5 flex h-full w-4">
      <div
        className={`absolute left-0 top-0 w-0.5 bg-gradient-to-b from-emerald-400 to-emerald-500 ${
          isLast ? "h-1/2" : "h-full"
        }`}
      />
      <div className="absolute left-0 top-1/2 h-0.5 w-full bg-gradient-to-r from-emerald-500 to-transparent" />
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
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex w-8 shrink-0 items-center justify-center">
          <TreeLevelIndicator level={node.level} />
        </div>
        <div className="min-w-0 flex-1">
          <ContestPayoutRow
            userColor={node.payment.userColor}
            left={
              <div className="min-w-0">
                <ContestPayoutRowTitle>{node.payment.username}</ContestPayoutRowTitle>
                <ContestPayoutRowSubtitle>
                  Level {node.level + 1} · {shareLabel}%
                </ContestPayoutRowSubtitle>
              </div>
            }
            right={
              wei !== null ? (
                <ContestPayoutGradientMoney>
                  {formatDollarFromWei(wei, paymentDecimals)}
                </ContestPayoutGradientMoney>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

export const ReferralRewardsTree: React.FC<ReferralRewardsTreeProps> = ({
  referralPayments,
  paymentDecimals,
}) => {
  const groups = useMemo(
    () => groupReferralPayments(referralPayments),
    [referralPayments],
  );

  if (groups.length === 0) {
    return <p className="pl-2 text-sm text-slate-500">No rewards payouts recorded.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          {group.nodes.map((node, index) => (
            <ReferralNodeRow
              key={`${node.payment.walletAddress}-${index}`}
              node={node}
              isFirst={index === 0}
              isLast={index === group.nodes.length - 1}
              paymentDecimals={paymentDecimals}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
