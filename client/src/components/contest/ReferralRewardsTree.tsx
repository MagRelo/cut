import { useMemo } from "react";
import type { OnchainPaymentView } from "../../types/contest";
import { formatDollarFromWei, parseAmountWei } from "./contestPayoutFormat";
import {
  ContestPayoutGradientMoney,
  ContestPayoutRow,
  ContestPayoutRowSubtitle,
  ContestPayoutRowTitle,
  ContestPayoutSubAmount,
} from "./contestPayoutPresentation";

interface ReferralRewardsTreeProps {
  referralPayments: OnchainPaymentView[];
  paymentDecimals: number;
  /** Contest winners, used to label the first link in each referral chain. */
  winners?: OnchainPaymentView[];
}

interface ReferralNode {
  payment: OnchainPaymentView;
  level: number;
}

interface ReferralGroup {
  id: string;
  winnerUsername: string;
  nodes: ReferralNode[];
}

function winnerUsernameByWallet(winners: OnchainPaymentView[] | undefined): Map<string, string> {
  const names = new Map<string, string>();
  for (const winner of winners ?? []) {
    if (!winner.walletAddress) continue;
    names.set(winner.walletAddress.toLowerCase(), winner.username);
  }
  return names;
}

function groupReferralPayments(
  referralPayments: OnchainPaymentView[],
  winners: OnchainPaymentView[] | undefined,
): ReferralGroup[] {
  const groupMap = new Map<string, ReferralNode[]>();
  const winnerNames = winnerUsernameByWallet(winners);

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
    });
  }

  const result: ReferralGroup[] = [];
  for (const [winner, nodes] of groupMap) {
    nodes.sort((a, b) => a.level - b.level);
    result.push({
      id: winner,
      winnerUsername: winnerNames.get(winner.toLowerCase()) ?? "Unknown",
      nodes,
    });
  }

  return result;
}

function referredUsername(group: ReferralGroup, index: number): string {
  if (index === 0) return group.winnerUsername;
  return group.nodes[index - 1]?.payment.username ?? "Unknown";
}

function referralLevelLabel(level: number): string {
  if (level <= 0) return "Direct";
  return `Level ${level + 1}`;
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
    <div className="relative ml-4 flex h-full w-4">
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
  referredName,
  isFirst,
  isLast,
  paymentDecimals,
}: {
  node: ReferralNode;
  referredName: string;
  isFirst: boolean;
  isLast: boolean;
  paymentDecimals: number;
}) {
  const wei = parseAmountWei(node.payment);

  return (
    <div className="relative flex items-stretch gap-1">
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
                <ContestPayoutRowSubtitle>Referred: {referredName}</ContestPayoutRowSubtitle>
              </div>
            }
            right={
              <>
                {wei !== null ? (
                  <ContestPayoutGradientMoney>
                    {formatDollarFromWei(wei, paymentDecimals)}
                  </ContestPayoutGradientMoney>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
                <ContestPayoutSubAmount>{referralLevelLabel(node.level)}</ContestPayoutSubAmount>
              </>
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
  winners,
}) => {
  const groups = useMemo(
    () => groupReferralPayments(referralPayments, winners),
    [referralPayments, winners],
  );

  if (groups.length === 0) {
    return <p className="pl-2 text-sm text-slate-500">&bull; No rewards payouts recorded</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          {group.nodes.map((node, index) => (
            <ReferralNodeRow
              key={`${node.payment.walletAddress}-${index}`}
              node={node}
              referredName={referredUsername(group, index)}
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
