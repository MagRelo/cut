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
      title="Payouts"
      maxWidth="4xl"
      scrollable
      maxHeight="600px"
    >
      {isLoading ? (
        <div className="flex items-center justify-center" style={{ minHeight: "200px" }}>
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Total Prize Pool Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Total Prize Pool
            </h3>
            <div className="text-3xl font-bold text-gray-900">
              ${Math.round(totalPrizePool).toLocaleString()}
            </div>
          </div>

          {/* Primary Contest Payouts */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Contest Payouts</h3>
              <div className="text-sm font-medium text-gray-600">
                ${Math.round(primaryPrizePoolData.netTotal).toLocaleString()}
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-1 mb-3">
              Distributed based on final scores and position. In case of ties, payouts are split
              evenly among tied participants.
            </div>

            {/* Primary Payout Structure */}
            <div className="space-y-3">
              {payoutStructure.map((payout) => {
                const payoutAmount = (primaryPrizePoolData.netTotal * payout.percentage) / 100;
                return (
                  <div
                    key={payout.position}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm bg-emerald-100 text-emerald-800">
                        {payout.position}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{payout.label}</div>
                        <div className="text-xs text-gray-500">{payout.percentage}%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        ${Math.round(payoutAmount).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payoutAmount.toFixed(2)} {tokenLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary Prediction Payouts */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Winner Pool Payouts</h3>
              <div className="text-sm font-medium text-gray-600">
                ${Math.round(secondaryLiquidityData.netTotal).toLocaleString()}
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-1 mb-3">
              Winner-take-all pool distributed proportionally to holders of the winning entry.
            </div>

            {/* Secondary Payout Structure - Winner Take All */}
            <div className="bg-white border border-purple-200 rounded-md p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm bg-purple-100 text-purple-800">
                  1
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Winner Ticket</div>
                  <div className="text-xs text-gray-500">100%</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    ${Math.round(secondaryLiquidityData.netTotal).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {secondaryLiquidityData.netTotal.toFixed(2)} {tokenLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Network Bonus */}
          {oracleFeeBps > 0 ? (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Rewards</h3>
                <div className="text-sm font-medium text-gray-600">
                  ${Math.round(networkBonusTotal).toLocaleString()}
                </div>
              </div>

              <div className="text-xs text-gray-500 mt-1 mb-3">
                Grow the game, reward the community, and give value back to players.
              </div>

              <div className="bg-white border border-blue-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">Network Bonus</div>
                    <div className="text-xs text-gray-500">Invite Rewards</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      ${Math.round(networkBonusTotal).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {networkBonusTotal.toFixed(2)} {tokenLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
};
