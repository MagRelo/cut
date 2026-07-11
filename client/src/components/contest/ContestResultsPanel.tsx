import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatUnits } from "viem";

import type { Contest, OnchainPaymentView } from "../../types/contest";
import { useContestPayoutSections } from "../../hooks/useContestPayoutSections";
import { contestPaymentDecimals } from "../../lib/paymentTokenSpend";
import { LoadingSpinner } from "../common/LoadingSpinner";
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

function formatTokenAmount(valueWei: bigint, decimals: number, fractionDigits = 2) {
  const valueStr = formatUnits(valueWei, decimals);
  const [whole, fraction = ""] = valueStr.split(".");
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fractionDigits <= 0) return wholeWithCommas;
  const fixedFraction = fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits);
  return `${wholeWithCommas}.${fixedFraction}`;
}

function formatDollarFromWei(valueWei: bigint, decimals: number, fractionDigits = 2) {
  return `$${formatTokenAmount(valueWei, decimals, fractionDigits)}`;
}

function formatShareBps(shareBps: number) {
  const percent = shareBps / 100;
  const fractionDigits = shareBps % 100 === 0 ? 0 : 2;
  return `${percent.toFixed(fractionDigits)}% of pool`;
}

function parseAmountWei(row: OnchainPaymentView): bigint | null {
  try {
    return BigInt(row.amountWei);
  } catch {
    return null;
  }
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
        {primary.length === 0 ? (
          <p className="text-sm text-slate-500">No contest payouts recorded.</p>
        ) : (
          <ContestPayoutDividedRows>
            {primary.map((row, index) => {
              const payoutWei = parseAmountWei(row);
              return (
                <ContestPayoutRow
                  key={`${row.entryId ?? row.walletAddress}-${index}`}
                  left={
                    <div className="flex min-w-0 items-stretch gap-2">
                      {row.position != null ? (
                        <div className="flex shrink-0 items-center">
                          <PositionBadge
                            position={row.position}
                            isInTheMoney
                            isUser={false}
                            primaryActionsLocked
                          />
                        </div>
                      ) : null}
                      {row.userColor ? (
                        <div
                          className="w-[3px] shrink-0 self-stretch rounded-full"
                          style={{ backgroundColor: row.userColor }}
                          aria-hidden
                        />
                      ) : null}
                      <div className="min-w-0 flex-1 py-0.5">
                        <ContestPayoutRowTitle>{row.username}</ContestPayoutRowTitle>
                        <ContestPayoutRowSubtitle>
                          {row.playerLastNames?.length
                            ? row.playerLastNames.join(", ")
                            : row.lineupName}
                        </ContestPayoutRowSubtitle>
                      </div>
                    </div>
                  }
                  right={
                    payoutWei !== null && payoutWei > 0n ? (
                      <>
                        <ContestPayoutGradientMoney>
                          {formatDollarFromWei(payoutWei, paymentDecimals)}
                        </ContestPayoutGradientMoney>
                        {row.score != null ? (
                          <ContestPayoutSubAmount>{row.score} pts</ContestPayoutSubAmount>
                        ) : null}
                      </>
                    ) : (
                      row.score != null ? (
                        <ContestPayoutRowSubtitle>{row.score} pts</ContestPayoutRowSubtitle>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )
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
        {secondary.length === 0 ? (
          <p className="text-sm text-slate-500">No winner pool payouts recorded.</p>
        ) : (
          <ContestPayoutDividedRows>
            {secondary.map((row, index) => {
              const wei = parseAmountWei(row);
              return (
                <ContestPayoutRow
                  key={`${row.entryId}-${row.walletAddress}-${index}`}
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
                          {formatDollarFromWei(wei, paymentDecimals)}
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
        {referral.length === 0 ? (
          <p className="text-sm text-slate-500">No rewards payouts recorded.</p>
        ) : (
          <ContestPayoutDividedRows>
            {referral.map((row, index) => {
              const wei = parseAmountWei(row);
              return (
                <ContestPayoutRow
                  key={`${row.walletAddress}-${index}`}
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
                          {formatDollarFromWei(wei, paymentDecimals)}
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
