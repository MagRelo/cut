import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { Contest, OnchainPaymentView } from "../../types/contest";
import { useContestPayoutSections } from "../../hooks/useContestPayoutSections";
import { contestPaymentDecimals } from "../../lib/paymentTokenSpend";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { formatDollarFromWei, parseAmountWei } from "./contestPayoutFormat";
import {
  ContestPayoutDividedRows,
  ContestPayoutGradientMoney,
  ContestPayoutLayout,
  ContestPayoutRow,
  ContestPayoutRowSubtitle,
  ContestPayoutRowTitle,
  ContestPayoutSubAmount,
} from "./contestPayoutPresentation";
import { ReferralRewardsTree } from "./ReferralRewardsTree";

interface ContestResultsPanelProps {
  contest: Contest;
  isLoading?: boolean;
}

function ContestResultsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="py-1">
      <h2 className="text-xl font-semibold leading-tight text-slate-900">{title}</h2>
      <div className="space-y-3">
        {description != null ? (
          <div className="text-xs leading-tight text-slate-500">{description}</div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

function formatShareBps(shareBps: number) {
  const percent = shareBps / 100;
  const fractionDigits = shareBps % 100 === 0 ? 0 : 2;
  return `${percent.toFixed(fractionDigits)}% of pool`;
}

function formatPrimaryScore(row: OnchainPaymentView): string | null {
  if (row.score == null) return null;
  return `${row.score} pts`;
}

function formatPrimaryLineupLabel(row: OnchainPaymentView, isTied: boolean): string {
  const name = row.playerLastNames?.length
    ? row.playerLastNames.join(", ")
    : (row.lineupName ?? "");
  if (!isTied || row.prediction == null) return name;
  return name ? `${name} (${row.prediction})` : `(${row.prediction})`;
}

function getScoresWithTies(rows: OnchainPaymentView[]): Set<number> {
  const scoreCounts = new Map<number, number>();
  for (const row of rows) {
    if (row.score != null) {
      scoreCounts.set(row.score, (scoreCounts.get(row.score) ?? 0) + 1);
    }
  }
  const tiedScores = new Set<number>();
  for (const [score, count] of scoreCounts) {
    if (count > 1) tiedScores.add(score);
  }
  return tiedScores;
}

function PayoutAmount({ wei, paymentDecimals }: { wei: bigint | null; paymentDecimals: number }) {
  if (wei === null) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <ContestPayoutGradientMoney>
      {formatDollarFromWei(wei, paymentDecimals)}
    </ContestPayoutGradientMoney>
  );
}

function ContestWinnerRows({
  rows,
  paymentDecimals,
}: {
  rows: OnchainPaymentView[];
  paymentDecimals: number;
}) {
  const tiedScores = getScoresWithTies(rows);

  return (
    <ContestPayoutDividedRows>
      {rows.map((row, index) => {
        const payoutWei = parseAmountWei(row);
        const scoreLabel = formatPrimaryScore(row);
        const isTied = row.score != null && tiedScores.has(row.score);
        const hasPayout = payoutWei !== null && payoutWei > 0n;

        return (
          <ContestPayoutRow
            key={`${row.entryId ?? row.walletAddress}-${index}`}
            userColor={row.userColor}
            left={
              <div className="min-w-0 py-0.5">
                <ContestPayoutRowTitle>{row.username}</ContestPayoutRowTitle>
                <ContestPayoutRowSubtitle>
                  {formatPrimaryLineupLabel(row, isTied)}
                </ContestPayoutRowSubtitle>
              </div>
            }
            right={
              hasPayout ? (
                <>
                  <PayoutAmount wei={payoutWei} paymentDecimals={paymentDecimals} />
                  {scoreLabel ? (
                    <ContestPayoutSubAmount tone="emphasis">{scoreLabel}</ContestPayoutSubAmount>
                  ) : null}
                </>
              ) : scoreLabel ? (
                <ContestPayoutSubAmount tone="emphasis">{scoreLabel}</ContestPayoutSubAmount>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )
            }
          />
        );
      })}
    </ContestPayoutDividedRows>
  );
}

function WinnerPoolRows({
  rows,
  paymentDecimals,
}: {
  rows: OnchainPaymentView[];
  paymentDecimals: number;
}) {
  return (
    <ContestPayoutDividedRows>
      {rows.map((row, index) => (
        <ContestPayoutRow
          key={`${row.entryId}-${row.walletAddress}-${index}`}
          userColor={row.userColor}
          left={
            <div className="min-w-0">
              <ContestPayoutRowTitle>{row.username}</ContestPayoutRowTitle>
              {row.shareBps != null && row.shareBps > 0 ? (
                <ContestPayoutRowSubtitle>{formatShareBps(row.shareBps)}</ContestPayoutRowSubtitle>
              ) : null}
            </div>
          }
          right={<PayoutAmount wei={parseAmountWei(row)} paymentDecimals={paymentDecimals} />}
        />
      ))}
    </ContestPayoutDividedRows>
  );
}

export const ContestResultsPanel: React.FC<ContestResultsPanelProps> = ({
  contest,
  isLoading = false,
}) => {
  const { primary, secondary, referral, hasAnyRows } = useContestPayoutSections(contest);
  const paymentDecimals = contestPaymentDecimals(
    contest.chainId,
    contest.settings?.paymentTokenAddress ?? "",
  );

  if (isLoading) {
    return (
      <ContestPayoutLayout>
        <div
          className="flex min-h-[160px] items-center justify-center"
          aria-busy="true"
          aria-label="Loading results"
        >
          <LoadingSpinner />
        </div>
      </ContestPayoutLayout>
    );
  }

  if (!hasAnyRows) {
    return (
      <ContestPayoutLayout>
        <p className="text-sm text-slate-500">Results not available.</p>
      </ContestPayoutLayout>
    );
  }

  return (
    <ContestPayoutLayout>
      <ContestResultsSection
        title="Contest Winners"
        description={
          <>
            Contest payouts are based on final standings.{" "}
            <Link to="/faq#contest-gameplay" className="text-blue-600 hover:underline">
              Learn more...
            </Link>
          </>
        }
      >
        {primary.length === 0 ? (
          <p className="mt-1 pl-2 text-sm text-slate-500">&bull; No contest payouts recorded</p>
        ) : (
          <ContestWinnerRows rows={primary} paymentDecimals={paymentDecimals} />
        )}
      </ContestResultsSection>

      <ContestResultsSection
        title="Winner Pool Payouts"
        description={
          <>
            Winner-ticket holders split the pool proportionally.{" "}
            <Link to="/faq#winner-pool" className="text-blue-600 hover:underline">
              Learn more...
            </Link>
          </>
        }
      >
        {secondary.length === 0 ? (
          <p className="mt-1 pl-2 text-sm text-slate-500">&bull; No winner pool payouts recorded</p>
        ) : (
          <WinnerPoolRows rows={secondary} paymentDecimals={paymentDecimals} />
        )}
      </ContestResultsSection>

      <ContestResultsSection
        title="Referral Rewards"
        description={
          <>
            When your friends win, you win.{" "}
            <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
              Learn more...
            </Link>
          </>
        }
      >
        <ReferralRewardsTree
          referralPayments={referral}
          paymentDecimals={paymentDecimals}
          winners={primary}
        />
      </ContestResultsSection>
    </ContestPayoutLayout>
  );
};
