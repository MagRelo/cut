import React, { useMemo } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useBalance, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { Modal } from "../common/Modal";
import type { Contest } from "../../types/contest";
import ContestContract from "../../utils/contracts/ContestController.json";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
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

function ContestContractDetailsSection({ contest, isOpen }: { contest: Contest; isOpen: boolean }) {
  const chainId = contest?.chainId as 8453 | 84532 | undefined;
  const readsEnabled = !!contest?.address && isOpen;

  const paymentTokenOnChain = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "paymentToken",
    args: [],
    chainId,
    query: { enabled: readsEnabled },
  }).data as `0x${string}` | undefined;

  const fallbackPaymentTokenAddress = contest?.settings?.paymentTokenAddress as
    | `0x${string}`
    | undefined;

  const paymentTokenAddress = paymentTokenOnChain ?? fallbackPaymentTokenAddress;

  const paymentTokenSymbol = useReadContract({
    address: paymentTokenAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    args: [],
    chainId,
    query: { enabled: !!paymentTokenAddress && readsEnabled },
  }).data as string | undefined;

  const paymentTokenDecimals = useReadContract({
    address: paymentTokenAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    args: [],
    chainId,
    query: { enabled: !!paymentTokenAddress && readsEnabled },
  }).data as number | undefined;

  const { data: contractBalance } = useBalance({
    address: contest?.address as `0x${string}`,
    token: paymentTokenAddress as `0x${string}` | undefined,
    chainId,
    query: { enabled: readsEnabled && !!paymentTokenAddress },
  });

  const contractState = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "state",
    args: [],
    chainId,
    query: { enabled: readsEnabled },
  }).data as number | undefined;

  const primarySideBalance = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getPrimarySideBalance",
    args: [],
    chainId,
    query: { enabled: readsEnabled },
  }).data as bigint | undefined;

  const totalSecondaryLiquidity = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalSecondaryLiquidity",
    args: [],
    chainId,
    query: { enabled: readsEnabled },
  }).data as bigint | undefined;

  const primaryDepositSecondarySubsidyBps = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryDepositSecondarySubsidyBps",
    args: [],
    chainId,
    query: { enabled: readsEnabled },
  }).data as bigint | undefined;

  const tokenDecimals = paymentTokenDecimals ?? contractBalance?.decimals ?? 18;
  const tokenSymbol =
    paymentTokenSymbol ?? contractBalance?.symbol ?? contest?.settings?.paymentTokenSymbol ?? "";

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

  const getStatusLabel = (state: number | undefined) => {
    if (state === undefined) return "Unknown";
    const statusMap: { [key: number]: string } = {
      0: "Open",
      1: "Active",
      2: "Locked",
      3: "Settled",
      4: "Cancelled",
      5: "Closed",
    };
    return statusMap[state] || "Unknown";
  };

  const getStatusColor = (state: number | undefined) => {
    if (state === undefined) return "text-gray-600";
    const colorMap: { [key: number]: string } = {
      0: "text-green-700 font-semibold",
      1: "text-blue-700 font-semibold",
      2: "text-yellow-700 font-semibold",
      3: "text-emerald-700 font-semibold",
      4: "text-red-700 font-semibold",
      5: "text-gray-700 font-semibold",
    };
    return colorMap[state] || "text-gray-600";
  };

  return (
    <ContestPayoutSection title="Contest Settings">
      <div className="flex flex-col gap-1.5 pb-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Current State</span>
          <span className={getStatusColor(contractState)}>{getStatusLabel(contractState)}</span>
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

        {contractBalance?.value !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Balance</span>
            <span className="font-semibold text-gray-900">
              {formatTokenAmount(contractBalance.value, {
                fractionDigits: 4,
                decimals: contractBalance.decimals,
              })}{" "}
              {tokenSymbol || contractBalance.symbol || resolvedTokenSymbol}
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
    </ContestPayoutSection>
  );
}

export const ContestPayoutsModal: React.FC<ContestPayoutsModalProps> = ({
  isOpen,
  onClose,
  contest,
}) => {
  const { paymentTokenSymbol, paymentTokenDecimals } = useAuth();
  const tokenDecimals = paymentTokenDecimals ?? 6;
  const tokenLabel = paymentTokenSymbol ?? "xUSDC";
  const chainId = contest?.chainId as 8453 | 84532 | undefined;
  const referralNetworkBps = Math.max(
    0,
    Math.min(10000, contest?.settings?.referralNetworkBps ?? contest?.settings?.oracleFeeBps ?? 0),
  );

  const {
    data: primaryPrizePool,
    isLoading: isLoadingPrimary,
    isError: isErrorPrimary,
    refetch: refetchPrimaryPrizePool,
  } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePool",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address && isOpen,
    },
  });

  const {
    data: totalSecondaryLiquidity,
    isLoading: isLoadingSecondaryLiquidity,
    isError: isErrorSecondaryLiquidity,
    refetch: refetchTotalSecondaryLiquidity,
  } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalSecondaryLiquidity",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address && isOpen,
    },
  });

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
      ? Number(formatUnits(primaryPrizePool as bigint, tokenDecimals))
      : 0;
    const netTotal = (grossTotal * (10000 - referralNetworkBps)) / 10000;
    return { grossTotal, netTotal };
  }, [primaryPrizePool, referralNetworkBps, tokenDecimals]);

  const secondaryLiquidityData = useMemo(() => {
    const grossTotal = totalSecondaryLiquidity
      ? Number(formatUnits(totalSecondaryLiquidity as bigint, tokenDecimals))
      : 0;
    const netTotal = (grossTotal * (10000 - referralNetworkBps)) / 10000;
    return { grossTotal, netTotal };
  }, [totalSecondaryLiquidity, referralNetworkBps, tokenDecimals]);

  const totalPrizePool = primaryPrizePoolData.grossTotal + secondaryLiquidityData.grossTotal;
  const networkBonusTotal = (totalPrizePool * referralNetworkBps) / 10000;

  const isLoading = isLoadingPrimary || isLoadingSecondaryLiquidity;
  const readsFailed =
    !!contest?.address && isOpen && !isLoading && (isErrorPrimary || isErrorSecondaryLiquidity);

  const refetchPayoutReads = () =>
    void Promise.all([refetchPrimaryPrizePool(), refetchTotalSecondaryLiquidity()]);

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
      maxWidth="4xl"
      scrollable
      maxHeight="600px"
      panelClassName="overflow-hidden bg-gray-100 p-2"
      contentClassName="rounded-sm border border-gray-300 bg-white"
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
            <ContestContractDetailsSection contest={contest} isOpen={isOpen} />
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
                  Payouts are based on final standings.{" "}
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
                      <ContestPayoutRowTitle>Winner Ticket</ContestPayoutRowTitle>
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

            <ContestContractDetailsSection contest={contest} isOpen={isOpen} />
          </ContestPayoutLayout>
        )}
      </div>
    </Modal>
  );
};
