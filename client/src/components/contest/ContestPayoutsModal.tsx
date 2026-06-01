import React, { useMemo } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Modal } from "../common/Modal";
import { LoadingSpinner } from "../common/LoadingSpinner";
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

export const ContestPayoutsModal: React.FC<ContestPayoutsModalProps> = ({
  isOpen,
  onClose,
  contest,
}) => {
  const { platformTokenSymbol } = useAuth();
  const tokenLabel = platformTokenSymbol ?? "CUT";
  const chainId = contest?.chainId as 8453 | 84532 | undefined;
  const referralNetworkBps = Math.max(
    0,
    Math.min(
      10000,
      contest?.settings?.referralNetworkBps ?? contest?.settings?.oracleFeeBps ?? 0,
    ),
  );

  // Read primary prize pool from contract
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

  // Calculate payout structure based on number of entries
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

  // Calculate primary prize pool breakdown
  const primaryPrizePoolData = useMemo(() => {
    const grossTotal = primaryPrizePool ? Number(formatUnits(primaryPrizePool as bigint, 18)) : 0;
    const netTotal = (grossTotal * (10000 - referralNetworkBps)) / 10000;
    return { grossTotal, netTotal };
  }, [primaryPrizePool, referralNetworkBps]);

  const secondaryLiquidityData = useMemo(() => {
    const grossTotal = totalSecondaryLiquidity
      ? Number(formatUnits(totalSecondaryLiquidity as bigint, 18))
      : 0;
    const netTotal = (grossTotal * (10000 - referralNetworkBps)) / 10000;
    return { grossTotal, netTotal };
  }, [totalSecondaryLiquidity, referralNetworkBps]);

  // Top summary shows total pot before oracle fee (gross).
  const totalPrizePool = primaryPrizePoolData.grossTotal + secondaryLiquidityData.grossTotal;
  const networkBonusTotal = (totalPrizePool * referralNetworkBps) / 10000;

  const isLoading = isLoadingPrimary || isLoadingSecondaryLiquidity;
  const readsFailed =
    !!contest?.address &&
    isOpen &&
    !isLoading &&
    (isErrorPrimary || isErrorSecondaryLiquidity);

  const refetchPayoutReads = () =>
    void Promise.all([refetchPrimaryPrizePool(), refetchTotalSecondaryLiquidity()]);

  const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contest payouts"
      hideHeader
      maxWidth="4xl"
      scrollable
      maxHeight="600px"
    >
      <div>
        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : readsFailed ? (
          <div className="p-3 font-display">
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
                <p className="text-sm text-amber-950/90 leading-relaxed">
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
          </div>
        ) : (
          <ContestPayoutLayout>
            <ContestPayoutHeroCard
              label="Total Prize Pool"
              amount={
                <ContestPayoutGradientMoney size="hero">
                  {formatCurrency(totalPrizePool)}
                </ContestPayoutGradientMoney>
              }
            />

            <ContestPayoutSection
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
                            {formatCurrency(payoutAmount)}
                          </ContestPayoutGradientMoney>
                          <ContestPayoutSubAmount>
                            {payoutAmount.toFixed(2)} {tokenLabel}
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
                        {formatCurrency(secondaryLiquidityData.netTotal)}
                      </ContestPayoutGradientMoney>
                      <ContestPayoutSubAmount>
                        {secondaryLiquidityData.netTotal.toFixed(2)} {tokenLabel}
                      </ContestPayoutSubAmount>
                    </>
                  }
                />
              </ContestPayoutDividedRows>
            </ContestPayoutSection>

            <ContestPayoutSection
              title="Rewards"
              description="Grow the game, reward the community, and give value back to players."
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
                        {formatCurrency(networkBonusTotal)}
                      </ContestPayoutGradientMoney>
                      <ContestPayoutSubAmount>
                        {networkBonusTotal.toFixed(2)} {tokenLabel}
                      </ContestPayoutSubAmount>
                    </>
                  }
                />
              </ContestPayoutDividedRows>
            </ContestPayoutSection>
          </ContestPayoutLayout>
        )}
      </div>
    </Modal>
  );
};
