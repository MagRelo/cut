import React, { useMemo } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { formatUnits } from "viem";
import { Modal } from "../common/Modal";
import type { Contest } from "../../types/contest";
import { useAuth } from "../../contexts/AuthContext";
import { defaultPaymentTokenSymbol } from "../../config/targetChain";
import { useContestChain, type ContestChainSnapshot } from "../../chain/useContestChain";
import {
  usePaymentTokenBalance,
  usePaymentTokenMetadata,
} from "../../chain/usePaymentTokenBalance";
import { Link } from "react-router-dom";
import { contestStatusValueClass, formatContestStatus } from "../../lib/contestStatus";
import { effectiveContestStatus } from "../../lib/lineupEditable";
import { contestWinnerPayoutBlurb } from "./contestPayoutFormat";
import {
  ContestPayoutDividedRows,
  ContestPayoutGradientMoney,
  ContestPayoutHeroCard,
  ContestPayoutLayout,
  ContestPayoutRow,
  ContestPayoutRowSubtitle,
  ContestPayoutRowTitle,
  ContestPayoutSection,
  ContestPayoutSubAmount,
} from "./contestPayoutPresentation";

interface ContestPayoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest;
}

function ContestContractDetailsSection({
  contest,
  snapshot,
  escrowValue,
  escrowDecimals,
  escrowSymbol,
  tokenSymbol: tokenSymbolProp,
  tokenDecimals: tokenDecimalsProp,
}: {
  contest: Contest;
  snapshot: ContestChainSnapshot;
  escrowValue?: bigint;
  escrowDecimals?: number;
  escrowSymbol?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
}) {
  const contractState = snapshot.state;
  const primarySideBalance = snapshot.primarySideBalance;
  const totalSecondaryLiquidity = snapshot.totalSecondaryLiquidity;
  const primaryDepositSecondarySubsidyBps = snapshot.primaryDepositSecondarySubsidyBps;

  const tokenDecimals = tokenDecimalsProp ?? escrowDecimals ?? snapshot.paymentDecimals;
  const tokenSymbol = tokenSymbolProp ?? escrowSymbol ?? contest?.settings?.paymentTokenSymbol ?? "";

  const formatTokenAmount = (
    value?: bigint,
    {
      fractionDigits = 2,
      decimals = tokenDecimals,
    }: { fractionDigits?: number; decimals?: number } = {},
  ) => {
    if (value === undefined) return "...";
    try {
      const normalized = formatUnits(value, decimals);
      const numeric = Number.parseFloat(normalized);
      if (Number.isNaN(numeric)) {
        return normalized;
      }
      return numeric.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
    } catch {
      return value.toString();
    }
  };

  const resolvedTokenSymbol = tokenSymbol || "TOKEN";

  const primaryDepositSecondarySubsidyPercent =
    primaryDepositSecondarySubsidyBps !== undefined
      ? Number(primaryDepositSecondarySubsidyBps) / 100
      : contest.settings?.primaryDepositSecondarySubsidyBps != null
        ? contest.settings.primaryDepositSecondarySubsidyBps / 100
        : undefined;

  const entryFee = contest.settings?.primaryDeposit;
  const inviteNetworkBps = Math.max(
    0,
    Math.min(10000, contest.settings?.referralNetworkBps ?? contest.settings?.oracleFeeBps ?? 0),
  );
  const inviteNetworkPercent = inviteNetworkBps / 100;

  const formatEntryFee = () => {
    if (entryFee === 0) return "Free";
    if (entryFee != null) return `$${entryFee}`;
    return "—";
  };

  const displayedStatus = effectiveContestStatus(contest.status, contractState);

  return (
    <section className="px-4 pb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Contest Settings
      </h3>
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Current State</span>
          <span className={`font-semibold ${contestStatusValueClass(displayedStatus)}`}>
            {formatContestStatus(displayedStatus)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Contest Entry Fee</span>
          <span className="font-semibold text-gray-900">{formatEntryFee()}</span>
        </div>

        {primaryDepositSecondarySubsidyPercent !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Winner Pool Subsidy</span>
            <span className="font-semibold text-gray-900">
              {primaryDepositSecondarySubsidyPercent.toFixed(2)}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Invite Network Reward</span>
          <span className="font-semibold text-gray-900">{inviteNetworkPercent.toFixed(2)}%</span>
        </div>

        {escrowValue !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Balance</span>
            <span className="font-semibold text-gray-900">
              {formatTokenAmount(escrowValue, {
                fractionDigits: 4,
                decimals: escrowDecimals ?? tokenDecimals,
              })}{" "}
              {tokenSymbol || escrowSymbol || resolvedTokenSymbol}
            </span>
          </div>
        )}

        {primarySideBalance !== undefined && (
          <div className="flex items-center justify-between">
            <span className="pl-4 text-gray-600">↳ Contest</span>
            <span className="text-gray-900">
              {formatTokenAmount(primarySideBalance, { fractionDigits: 4 })} {resolvedTokenSymbol}
            </span>
          </div>
        )}

        {totalSecondaryLiquidity !== undefined && (
          <div className="flex items-center justify-between">
            <span className="pl-4 text-gray-600">↳ Winner Pool</span>
            <span className="text-gray-900">
              {formatTokenAmount(totalSecondaryLiquidity, { fractionDigits: 4 })}{" "}
              {resolvedTokenSymbol}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export const ContestPayoutsModal: React.FC<ContestPayoutsModalProps> = ({
  isOpen,
  onClose,
  contest,
}) => {
  const { paymentTokenSymbol, paymentTokenDecimals } = useAuth();
  const tokenDecimals = paymentTokenDecimals ?? 6;
  const tokenLabel = paymentTokenSymbol ?? defaultPaymentTokenSymbol();
  const referralNetworkBps = Math.max(
    0,
    Math.min(10000, contest?.settings?.referralNetworkBps ?? contest?.settings?.oracleFeeBps ?? 0),
  );
  const readsEnabled = Boolean(contest?.address && isOpen);
  const snapshot = useContestChain(contest, { enabled: readsEnabled });
  const tokenMetadata = usePaymentTokenMetadata({
    token: snapshot.paymentTokenAddress,
    chainId: contest.chainId,
    enabled: readsEnabled && Boolean(snapshot.paymentTokenAddress),
  });
  const escrow = usePaymentTokenBalance({
    address: contest.address ? (contest.address as `0x${string}`) : undefined,
    token: snapshot.paymentTokenAddress,
    chainId: contest.chainId,
    enabled: readsEnabled && Boolean(snapshot.paymentTokenAddress),
  });
  const primaryPrizePool = snapshot.primaryPrizePool;
  const totalSecondaryLiquidity = snapshot.totalSecondaryLiquidity;

  const entryCount = contest?.contestLineups?.length ?? 0;
  const isLargeContest = entryCount >= 10;
  const payoutStructure = useMemo(() => {
    if (isLargeContest) {
      return [
        { position: 1, percentage: 70, label: "1st Place" },
        { position: 2, percentage: 20, label: "2nd Place" },
        { position: 3, percentage: 10, label: "3rd Place" },
      ];
    }
    return [{ position: 1, percentage: 100, label: "1st Place" }];
  }, [isLargeContest]);

  const primaryPrizePoolData = useMemo(() => {
    const grossTotal = primaryPrizePool
      ? Number(formatUnits(primaryPrizePool, tokenDecimals))
      : 0;
    const netTotal = (grossTotal * (10000 - referralNetworkBps)) / 10000;
    return { grossTotal, netTotal };
  }, [primaryPrizePool, referralNetworkBps, tokenDecimals]);

  const secondaryLiquidityData = useMemo(() => {
    const grossTotal = totalSecondaryLiquidity
      ? Number(formatUnits(totalSecondaryLiquidity, tokenDecimals))
      : 0;
    const netTotal = (grossTotal * (10000 - referralNetworkBps)) / 10000;
    return { grossTotal, netTotal };
  }, [totalSecondaryLiquidity, referralNetworkBps, tokenDecimals]);

  const totalPrizePool = primaryPrizePoolData.grossTotal + secondaryLiquidityData.grossTotal;
  const networkBonusTotal = (totalPrizePool * referralNetworkBps) / 10000;

  const isLoading = snapshot.isLoading;
  const readsFailed =
    readsEnabled &&
    !isLoading &&
    (snapshot.failed.primaryPrizePool || snapshot.failed.totalSecondaryLiquidity);

  const refetchPayoutReads = () => void snapshot.refetch();

  const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;

  const formatCurrencyDisplay = (value: number) => (isLoading ? "..." : formatCurrency(value));

  const formatTokenDisplay = (value: number) =>
    isLoading ? "..." : `${value.toFixed(2)} ${tokenLabel}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contest payouts"
      hideHeader
      showCloseButton={false}
      maxWidth="4xl"
      scrollable
      maxHeight="600px"
      panelClassName="overflow-hidden bg-gray-100 p-2"
      contentClassName="rounded-sm border border-slate-300 bg-white"
    >
      <div>
        {readsFailed ? (
          <ContestPayoutLayout>
            <div
              className="overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-tl from-amber-100 via-amber-50 to-white shadow-sm"
              role="status"
            >
              <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/80 px-3 py-2">
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                  Payout data unavailable
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm leading-relaxed text-amber-950/90">
                  Couldn&apos;t load prize pool totals from the network. This is usually temporary
                  (RPC or connectivity).{" "}
                  <button
                    type="button"
                    onClick={refetchPayoutReads}
                    className="font-medium text-amber-950 underline-offset-2 hover:underline"
                  >
                    Try again
                  </button>
                </p>
              </div>
            </div>
            <ContestContractDetailsSection
              contest={contest}
              snapshot={snapshot}
              escrowValue={escrow.value}
              escrowDecimals={escrow.decimals}
              escrowSymbol={escrow.symbol}
              tokenSymbol={tokenMetadata.symbol}
              tokenDecimals={tokenMetadata.decimals}
            />
          </ContestPayoutLayout>
        ) : (
          <ContestPayoutLayout>
            <ContestPayoutHeroCard
              label="Total Prize Pool"
              amount={
                <ContestPayoutGradientMoney size="hero" tone="light">
                  {formatCurrencyDisplay(totalPrizePool)}
                </ContestPayoutGradientMoney>
              }
            />

            <ContestPayoutSection
              title="Contest"
              description={
                <>
                  {contestWinnerPayoutBlurb(contest)}{" "}
                  <Link to="/faq#contest-gameplay" className="text-blue-600 hover:underline">
                    Learn more...
                  </Link>
                </>
              }
            >
              <ContestPayoutDividedRows>
                {payoutStructure.map((payout) => {
                  const payoutAmount = (primaryPrizePoolData.netTotal * payout.percentage) / 100;
                  return (
                    <ContestPayoutRow
                      key={payout.position}
                      left={
                        <>
                          <ContestPayoutRowTitle>{payout.label}</ContestPayoutRowTitle>
                          <ContestPayoutRowSubtitle>{payout.percentage}%</ContestPayoutRowSubtitle>
                        </>
                      }
                      right={
                        <>
                          <ContestPayoutGradientMoney>
                            {formatCurrencyDisplay(payoutAmount)}
                          </ContestPayoutGradientMoney>
                          <ContestPayoutSubAmount>
                            {formatTokenDisplay(payoutAmount)}
                          </ContestPayoutSubAmount>
                        </>
                      }
                    />
                  );
                })}
              </ContestPayoutDividedRows>
            </ContestPayoutSection>

            <ContestPayoutSection
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
              <ContestPayoutDividedRows>
                <ContestPayoutRow
                  left={
                    <>
                      <ContestPayoutRowTitle>Total Winner Pool</ContestPayoutRowTitle>
                      <ContestPayoutRowSubtitle>100% of winner pool</ContestPayoutRowSubtitle>
                    </>
                  }
                  right={
                    <>
                      <ContestPayoutGradientMoney>
                        {formatCurrencyDisplay(secondaryLiquidityData.netTotal)}
                      </ContestPayoutGradientMoney>
                      <ContestPayoutSubAmount>
                        {formatTokenDisplay(secondaryLiquidityData.netTotal)}
                      </ContestPayoutSubAmount>
                    </>
                  }
                />
              </ContestPayoutDividedRows>
            </ContestPayoutSection>

            <ContestPayoutSection
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
              <ContestPayoutDividedRows>
                <ContestPayoutRow
                  left={
                    <>
                      <ContestPayoutRowTitle>Invite Network</ContestPayoutRowTitle>
                      <ContestPayoutRowSubtitle>
                        {referralNetworkBps > 0
                          ? "Invite rewards"
                          : "No rewards allocation for this contest"}
                      </ContestPayoutRowSubtitle>
                    </>
                  }
                  right={
                    <>
                      <ContestPayoutGradientMoney>
                        {formatCurrencyDisplay(networkBonusTotal)}
                      </ContestPayoutGradientMoney>
                      <ContestPayoutSubAmount>
                        {formatTokenDisplay(networkBonusTotal)}
                      </ContestPayoutSubAmount>
                    </>
                  }
                />
              </ContestPayoutDividedRows>
            </ContestPayoutSection>

            <ContestContractDetailsSection
              contest={contest}
              snapshot={snapshot}
              escrowValue={escrow.value}
              escrowDecimals={escrow.decimals}
              escrowSymbol={escrow.symbol}
              tokenSymbol={tokenMetadata.symbol}
              tokenDecimals={tokenMetadata.decimals}
            />
          </ContestPayoutLayout>
        )}
      </div>
    </Modal>
  );
};
