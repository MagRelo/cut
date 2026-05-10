import React, { useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Modal } from "../common/Modal";
import { LoadingSpinner } from "../common/LoadingSpinner";
import type { Contest } from "../../types/contest";
import ContestContract from "../../utils/contracts/ContestController.json";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";

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
        ) : (
          <div className="space-y-4 bg-gray-100 p-3 font-display">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1.35fr_1fr] sm:items-end">
                <div>
                  <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.16em] text-slate-600">
                    Total Prize Pool
                  </p>
                  <p className="mt-1 bg-gradient-to-b from-emerald-600 to-emerald-700 bg-clip-text text-4xl font-semibold leading-tight tracking-tight text-transparent tabular-nums drop-shadow-[0_1px_0_rgba(5,150,105,0.12)]">
                    {formatCurrency(totalPrizePool)}
                  </p>
                </div>
                {/* <div className="grid grid-cols-2 gap-2 rounded-lg border border-blue-200/70 bg-white/90 p-2.5">
                  <div className="rounded-md bg-blue-50 px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                      Contest Pool
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(primaryPrizePoolData.grossTotal)}
                    </p>
                  </div>
                  <div className="rounded-md bg-indigo-50 px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
                      Winner Pool
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(secondaryLiquidityData.grossTotal)}
                    </p>
                  </div>
                </div> */}
              </div>
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-xl font-semibold leading-tight text-slate-900">Contest</h2>
                <p className="mt-1 text-xs leading-tight text-slate-500">
                  Payouts are based on final standings. Ties pool winnings and split evenly.{" "}
                  <Link to="/faq#contest-gameplay" className="text-blue-600 hover:underline">
                    Learn more...
                  </Link>
                </p>
              </div>
              <div className="divide-y divide-slate-200">
                {payoutStructure.map((payout) => {
                  const payoutAmount = (primaryPrizePoolData.netTotal * payout.percentage) / 100;
                  return (
                    <div
                      key={payout.position}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-tight text-slate-800">
                          {payout.label}
                        </p>
                        <p className="mt-0.5 text-xs leading-tight text-slate-500">
                          {payout.percentage}%
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="bg-gradient-to-b from-emerald-600 to-emerald-700 bg-clip-text text-lg font-semibold leading-tight text-transparent tabular-nums drop-shadow-[0_1px_0_rgba(5,150,105,0.12)]">
                          {formatCurrency(payoutAmount)}
                        </p>
                        <p className="mt-0.5 text-xs leading-tight tabular-nums text-slate-500">
                          {payoutAmount.toFixed(2)} {tokenLabel}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-xl font-semibold leading-tight text-slate-900">Winner Pool</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Winner-ticket holders split this pool proportionally.{" "}
                  <Link to="/faq#winner-pool" className="text-blue-600 hover:underline">
                    Learn more...
                  </Link>
                </p>
              </div>
              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-base font-semibold leading-tight text-slate-800">
                      Winner Ticket
                    </p>
                    <p className="mt-0.5 text-xs leading-tight text-slate-500">
                      100% of winner pool
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="bg-gradient-to-b from-emerald-600 to-emerald-700 bg-clip-text text-lg font-semibold leading-tight text-transparent tabular-nums drop-shadow-[0_1px_0_rgba(5,150,105,0.12)]">
                      {formatCurrency(secondaryLiquidityData.netTotal)}
                    </p>
                    <p className="mt-0.5 text-xs leading-tight tabular-nums text-slate-500">
                      {secondaryLiquidityData.netTotal.toFixed(2)} {tokenLabel}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-xl font-semibold leading-tight text-slate-900">Rewards</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Grow the game, reward the community, and give value back to players.
                </p>
              </div>
              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-base font-semibold leading-tight text-slate-800">
                      Invite Network
                    </p>
                    <p className="mt-0.5 text-xs leading-tight text-slate-500">
                      {oracleFeeBps > 0
                        ? "Invite rewards"
                        : "No rewards allocation for this contest"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="bg-gradient-to-b from-emerald-600 to-emerald-700 bg-clip-text text-lg font-semibold leading-tight text-transparent tabular-nums drop-shadow-[0_1px_0_rgba(5,150,105,0.12)]">
                      {formatCurrency(networkBonusTotal)}
                    </p>
                    <p className="mt-0.5 text-xs leading-tight tabular-nums text-slate-500">
                      {networkBonusTotal.toFixed(2)} {tokenLabel}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            {/* 
            <div>
              {contractExplorerLink ? (
                <div className="mb-2 ml-4">{contractExplorerLink}</div>
              ) : null}
            </div> */}
          </div>
        )}
      </div>
    </Modal>
  );
};
