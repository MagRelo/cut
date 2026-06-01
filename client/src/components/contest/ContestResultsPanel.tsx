import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatUnits } from "viem";

import type {
  Contest,
  DetailedResult,
  RewardsPayoutResult,
  SecondaryPayoutResult,
} from "../../types/contest";
import { PositionBadge } from "./PositionBadge";
import {
  ContestPayoutDividedRows,
  ContestPayoutGradientMoney,
  ContestPayoutLayout,
  ContestPayoutRow,
  ContestPayoutRowSubtitle,
  ContestPayoutRowTitle,
  ContestPayoutSubAmount,
} from "./contestPayoutPresentation";

interface ContestResultsPanelProps {
  contest: Contest;
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
    <section className="space-y-2 py-1">
      <div>
        <h2 className="text-xl font-semibold leading-tight text-slate-900">{title}</h2>
        {description != null ? (
          <div className="mt-1 text-xs leading-tight text-slate-500">{description}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function formatTokenAmount(valueWei: bigint, fractionDigits = 2) {
  const valueStr = formatUnits(valueWei, 18);
  const [whole, fraction = ""] = valueStr.split(".");
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fractionDigits <= 0) return wholeWithCommas;
  const fixedFraction = fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits);
  return `${wholeWithCommas}.${fixedFraction}`;
}

function formatDollarFromWei(valueWei: bigint, fractionDigits = 2) {
  return `$${formatTokenAmount(valueWei, fractionDigits)}`;
}

function formatShareBps(shareBps: number) {
  const percent = shareBps / 100;
  const fractionDigits = shareBps % 100 === 0 ? 0 : 2;
  return `${percent.toFixed(fractionDigits)}% of pool`;
}

function primaryPayoutWei(result: DetailedResult): bigint | null {
  if (result.payoutBasisPoints <= 0) return null;
  try {
    if (result.payoutAmountWei !== undefined || result.positionBonusAmountWei !== undefined) {
      const p = BigInt(result.payoutAmountWei ?? "0");
      const b = BigInt(result.positionBonusAmountWei ?? "0");
      return p + b;
    }
  } catch {
    return null;
  }
  return null;
}

function secondaryAmountWei(row: SecondaryPayoutResult): bigint | null {
  try {
    return BigInt(row.amountWei);
  } catch {
    return null;
  }
}

function rewardsAmountWei(row: RewardsPayoutResult): bigint | null {
  try {
    return BigInt(row.amountWei);
  } catch {
    return null;
  }
}

export const ContestResultsPanel: React.FC<ContestResultsPanelProps> = ({ contest }) => {
  const primaryRowsWithPayout = useMemo(() => {
    return [...(contest.results?.detailedResults ?? [])]
      .filter((r) => r.payoutBasisPoints > 0)
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return a.entryId.localeCompare(b.entryId);
      });
  }, [contest.results?.detailedResults]);

  const sortedSecondaryPayouts = useMemo(() => {
    const rows = contest.results?.secondaryPayouts ?? [];
    return [...rows].sort((a, b) => {
      const wa = secondaryAmountWei(a) ?? 0n;
      const wb = secondaryAmountWei(b) ?? 0n;
      if (wa === wb) return a.walletAddress.localeCompare(b.walletAddress);
      return wa < wb ? 1 : -1;
    });
  }, [contest.results?.secondaryPayouts]);

  const sortedRewardsPayouts = useMemo(() => {
    const rows = contest.results?.rewardsPayouts ?? [];
    return [...rows].sort((a, b) => {
      const wa = rewardsAmountWei(a) ?? 0n;
      const wb = rewardsAmountWei(b) ?? 0n;
      if (wa === wb) return a.walletAddress.localeCompare(b.walletAddress);
      return wa < wb ? 1 : -1;
    });
  }, [contest.results?.rewardsPayouts]);

  const hasAnyRows =
    primaryRowsWithPayout.length > 0 ||
    sortedSecondaryPayouts.length > 0 ||
    sortedRewardsPayouts.length > 0;

  if (!hasAnyRows) {
    return (
      <ContestPayoutLayout background="white">
        <p className="text-sm text-slate-500">Results not available.</p>
      </ContestPayoutLayout>
    );
  }

  return (
    <ContestPayoutLayout background="white">
      <ContestResultsSection
        title="Contest"
        description={
          <>
            Payouts are based on final standings. Ties pool winnings and split evenly.{" "}
            <Link to="/faq#contest-gameplay" className="text-blue-600 hover:underline">
              Learn more...
            </Link>
          </>
        }
      >
        {primaryRowsWithPayout.length === 0 ? (
          <p className="text-sm text-slate-500">No contest payouts recorded.</p>
        ) : (
          <ContestPayoutDividedRows>
            {primaryRowsWithPayout.map((result, index) => {
              const payoutWei = primaryPayoutWei(result);
              return (
                <ContestPayoutRow
                  key={`${result.entryId}-${index}`}
                  left={
                    <div className="flex min-w-0 items-stretch gap-2">
                      <div className="flex shrink-0 items-center">
                        <PositionBadge
                          position={result.position}
                          isInTheMoney={result.payoutBasisPoints > 0}
                          isUser={false}
                          primaryActionsLocked
                        />
                      </div>
                      {result.userColor ? (
                        <div
                          className="w-[3px] shrink-0 self-stretch rounded-full"
                          style={{ backgroundColor: result.userColor }}
                          aria-hidden
                        />
                      ) : null}
                      <div className="min-w-0 flex-1 py-0.5">
                        <ContestPayoutRowTitle>{result.username}</ContestPayoutRowTitle>
                        <ContestPayoutRowSubtitle>
                          {result.playerLastNames?.length
                            ? result.playerLastNames.join(", ")
                            : result.lineupName}
                        </ContestPayoutRowSubtitle>
                      </div>
                    </div>
                  }
                  right={
                    payoutWei !== null ? (
                      <>
                        <ContestPayoutGradientMoney>
                          {formatDollarFromWei(payoutWei)}
                        </ContestPayoutGradientMoney>
                        <ContestPayoutSubAmount>{result.score} pts</ContestPayoutSubAmount>
                      </>
                    ) : (
                      <ContestPayoutRowSubtitle>{result.score} pts</ContestPayoutRowSubtitle>
                    )
                  }
                />
              );
            })}
          </ContestPayoutDividedRows>
        )}
      </ContestResultsSection>

      <hr className="border-slate-200" />

      <ContestResultsSection
        title="Winner Pool"
        description={
          <>
            Winner-ticket holders split this pool proportionally.{" "}
            <Link to="/faq#winner-pool" className="text-blue-600 hover:underline">
              Learn more...
            </Link>
          </>
        }
      >
        {sortedSecondaryPayouts.length === 0 ? (
          <p className="text-sm text-slate-500">No winner pool payouts recorded.</p>
        ) : (
          <ContestPayoutDividedRows>
            {sortedSecondaryPayouts.map((row, index) => {
              const wei = secondaryAmountWei(row);
              return (
                <ContestPayoutRow
                  key={`${row.entryId}-${row.userId ?? "anon"}-${index}`}
                  left={
                    <div
                      className={`min-w-0 ${row.userColor ? "border-l-[3px] border-solid pl-2" : ""}`}
                      style={row.userColor ? { borderLeftColor: row.userColor } : undefined}
                    >
                      <ContestPayoutRowTitle>{row.username}</ContestPayoutRowTitle>
                      {row.shareBps != null && row.shareBps > 0 ? (
                        <ContestPayoutRowSubtitle>
                          {formatShareBps(row.shareBps)}
                        </ContestPayoutRowSubtitle>
                      ) : null}
                    </div>
                  }
                  right={
                    wei !== null ? (
                      <>
                        <ContestPayoutGradientMoney>
                          {formatDollarFromWei(wei)}
                        </ContestPayoutGradientMoney>
                        <ContestPayoutSubAmount>payout</ContestPayoutSubAmount>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )
                  }
                />
              );
            })}
          </ContestPayoutDividedRows>
        )}
      </ContestResultsSection>

      <hr className="border-slate-200" />

      <ContestResultsSection
        title="Rewards"
        description={
          <>
            Grow the game, reward the community, and give value back to players.{" "}
            <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
              Learn more...
            </Link>
          </>
        }
      >
        {sortedRewardsPayouts.length === 0 ? (
          <p className="text-sm text-slate-500">No rewards payouts recorded.</p>
        ) : (
          <ContestPayoutDividedRows>
            {sortedRewardsPayouts.map((row, index) => {
              const wei = rewardsAmountWei(row);
              const key = row.entryId ?? `${row.walletAddress}-${index}`;
              return (
                <ContestPayoutRow
                  key={key}
                  left={
                    <div
                      className={`min-w-0 ${row.userColor ? "border-l-[3px] border-solid pl-2" : ""}`}
                      style={row.userColor ? { borderLeftColor: row.userColor } : undefined}
                    >
                      <ContestPayoutRowTitle>{row.username}</ContestPayoutRowTitle>
                    </div>
                  }
                  right={
                    wei !== null ? (
                      <>
                        <ContestPayoutGradientMoney>
                          {formatDollarFromWei(wei)}
                        </ContestPayoutGradientMoney>
                        <ContestPayoutSubAmount>reward</ContestPayoutSubAmount>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )
                  }
                />
              );
            })}
          </ContestPayoutDividedRows>
        )}
      </ContestResultsSection>
    </ContestPayoutLayout>
  );
};
