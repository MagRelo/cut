import React, { useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Modal } from "../common/Modal";
import { LoadingSpinner } from "../common/LoadingSpinner";
import type { Contest } from "../../types/contest";
import ContestContract from "../../utils/contracts/ContestController.json";
import { useAuth } from "../../contexts/AuthContext";

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
  const oracleFeeBps = Math.max(0, Math.min(10000, contest?.settings?.oracleFeeBps ?? 0));

  // Read primary prize pool from contract
  const { data: primaryPrizePool, isLoading: isLoadingPrimary } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePool",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address && isOpen,
    },
  });

  const { data: totalSecondaryLiquidity, isLoading: isLoadingSecondaryLiquidity } = useReadContract(
    {
      address: contest?.address as `0x${string}`,
      abi: ContestContract.abi,
      functionName: "totalSecondaryLiquidity",
      args: [],
      chainId,
      query: {
        enabled: !!contest?.address && isOpen,
      },
    },
  );

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
    const netTotal = (grossTotal * (10000 - oracleFeeBps)) / 10000;
    return { grossTotal, netTotal };
  }, [primaryPrizePool, oracleFeeBps]);

  const secondaryLiquidityData = useMemo(() => {
    const grossTotal = totalSecondaryLiquidity
      ? Number(formatUnits(totalSecondaryLiquidity as bigint, 18))
      : 0;
    const netTotal = (grossTotal * (10000 - oracleFeeBps)) / 10000;
    return { grossTotal, netTotal };
  }, [totalSecondaryLiquidity, oracleFeeBps]);

  // Top summary shows total pot before oracle fee (gross).
  const totalPrizePool = primaryPrizePoolData.grossTotal + secondaryLiquidityData.grossTotal;
  const networkBonusTotal = (totalPrizePool * oracleFeeBps) / 10000;

  const isLoading = isLoadingPrimary || isLoadingSecondaryLiquidity;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contest Payouts"
      maxWidth="4xl"
      scrollable
      maxHeight="600px"
    >
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Total Prize Pool Summary */}
          <div className="overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-tl from-blue-100 via-blue-50 to-white shadow-sm font-display">
            <div className="border-b border-blue-200 bg-blue-50/80 px-3 py-1.5">
              <div className="font-display text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-blue-700">
                Total prize pool
              </div>
            </div>
            <div className="p-3 pt-2">
              <p className="font-display text-4xl font-semibold leading-tight tracking-tight text-slate-900 tabular-nums">
                ${Math.round(totalPrizePool).toLocaleString()}
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <div className="border-b border-slate-200 pb-1">
              <h2 className="font-display text-xl font-semibold leading-tight text-slate-900">
                Contest payouts
              </h2>
            </div>
            {/* <p className="text-sm leading-tight text-slate-500">
              Distributed based on final scores and position. In case of ties, payouts are split
              evenly among tied participants.
            </p> */}
            <div className="divide-y divide-slate-200 pl-4 sm:pl-5">
              {payoutStructure.map((payout) => {
                const payoutAmount = (primaryPrizePoolData.netTotal * payout.percentage) / 100;
                return (
                  <div
                    key={payout.position}
                    className="flex items-baseline justify-between gap-3 py-2 first:pt-1"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-md font-semibold leading-tight text-slate-800">
                        {payout.label}
                      </p>
                      <p className="mt-px font-display text-xs leading-tight text-slate-500">
                        {payout.percentage}% of contest pool
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-xl font-semibold leading-tight text-emerald-700 tabular-nums">
                        ${Math.round(payoutAmount).toLocaleString()}
                      </p>
                      <p className="mt-px font-display text-xs leading-tight tabular-nums text-slate-500">
                        {payoutAmount.toFixed(2)} {tokenLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <div className="border-b border-slate-200 pb-1">
              <h2 className="font-display text-xl font-semibold leading-tight text-slate-900">
                Winner Pool payouts
              </h2>
            </div>
            {/* <p className="text-sm leading-tight text-slate-500">
              Winner-take-all pool distributed proportionally to holders of the winning entry.
            </p> */}
            <div className="divide-y divide-slate-200 pl-4 sm:pl-5">
              <div className="flex items-baseline justify-between gap-3 py-2 first:pt-1">
                <div className="min-w-0">
                  <p className="font-display text-md font-semibold leading-tight text-slate-800">
                    Winner ticket
                  </p>
                  <p className="mt-px font-display text-xs leading-tight text-slate-500">
                    100% of winner pool
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-xl font-semibold leading-tight text-emerald-700 tabular-nums">
                    ${Math.round(secondaryLiquidityData.netTotal).toLocaleString()}
                  </p>
                  <p className="mt-px font-display text-xs leading-tight tabular-nums text-slate-500">
                    {secondaryLiquidityData.netTotal.toFixed(2)} {tokenLabel}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <div className="border-b border-slate-200 pb-1">
              <h2 className="font-display text-xl font-semibold leading-tight text-slate-900">
                Rewards
              </h2>
            </div>
            {/* <p className="text-sm leading-tight text-slate-500">
              Grow the game, reward the community, and give value back to players.
            </p> */}
            <div className="divide-y divide-slate-200 pl-4 sm:pl-5">
              <div className="flex items-baseline justify-between gap-3 py-2 first:pt-1">
                <div className="min-w-0">
                  <p className="font-display text-md font-semibold leading-tight text-slate-800">
                    Network bonus
                  </p>
                  <p className="mt-px font-display text-xs leading-tight text-slate-500">
                    {oracleFeeBps > 0 ? "Invite rewards" : "No rewards allocation for this contest"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-xl font-semibold leading-tight text-emerald-700 tabular-nums">
                    ${Math.round(networkBonusTotal).toLocaleString()}
                  </p>
                  <p className="mt-px font-display text-xs leading-tight tabular-nums text-slate-500">
                    {networkBonusTotal.toFixed(2)} {tokenLabel}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
};
