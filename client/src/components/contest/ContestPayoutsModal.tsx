import React, { useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Modal } from "../common/Modal";
import { LoadingSpinner } from "../common/LoadingSpinner";
import type { Contest } from "../../types/contest";
import ContestContract from "../../utils/contracts/Contest.json";

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
  const chainId = contest?.chainId as 8453 | 84532 | undefined;

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

  // Read primary prize pool subsidy from contract
  const { data: primaryPrizePoolSubsidy, isLoading: isLoadingSubsidy } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePoolSubsidy",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address && isOpen,
    },
  });

  // Read total primary position subsidies from contract
  const { data: totalPrimaryPositionSubsidies } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalPrimaryPositionSubsidies",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address && isOpen,
    },
  });

  // Read secondary prize pool from contract
  const { data: secondaryPrizePool, isLoading: isLoadingSecondary } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "secondaryPrizePool",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address && isOpen,
    },
  });

  // Read secondary prize pool subsidy from contract
  const { data: secondaryPrizePoolSubsidy, isLoading: isLoadingSecondarySubsidy } = useReadContract(
    {
      address: contest?.address as `0x${string}`,
      abi: ContestContract.abi,
      functionName: "secondaryPrizePoolSubsidy",
      args: [],
      chainId,
      query: {
        enabled: !!contest?.address && isOpen,
      },
    }
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
    const base = primaryPrizePool ? Number(formatUnits(primaryPrizePool as bigint, 18)) : 0;
    const subsidy = primaryPrizePoolSubsidy
      ? Number(formatUnits(primaryPrizePoolSubsidy as bigint, 18))
      : 0;
    const positionSubsidies = totalPrimaryPositionSubsidies
      ? Number(formatUnits(totalPrimaryPositionSubsidies as bigint, 18))
      : 0;
    const total = base + subsidy + positionSubsidies;
    return { base, subsidy, positionSubsidies, total };
  }, [primaryPrizePool, primaryPrizePoolSubsidy, totalPrimaryPositionSubsidies]);

  // Calculate secondary prize pool breakdown
  const secondaryPrizePoolData = useMemo(() => {
    const base = secondaryPrizePool ? Number(formatUnits(secondaryPrizePool as bigint, 18)) : 0;
    const subsidy = secondaryPrizePoolSubsidy
      ? Number(formatUnits(secondaryPrizePoolSubsidy as bigint, 18))
      : 0;
    const total = base + subsidy;
    return { base, subsidy, total };
  }, [secondaryPrizePool, secondaryPrizePoolSubsidy]);

  // Calculate total prize pool (for display)
  const totalPrizePool = primaryPrizePoolData.total + secondaryPrizePoolData.total;

  const isLoading =
    isLoadingPrimary || isLoadingSubsidy || isLoadingSecondary || isLoadingSecondarySubsidy;

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
        <div className="space-y-6">
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
                ${Math.round(primaryPrizePoolData.total).toLocaleString()}
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-1 mb-3">
              Distributed based on final scores and position. In case of ties, payouts are split
              evenly among tied participants. Position bonuses are added to the winner's payout.
            </div>

            {/* Primary Payout Structure */}
            <div className="space-y-3">
              {payoutStructure.map((payout) => {
                const payoutAmount = (primaryPrizePoolData.total * payout.percentage) / 100;
                return (
                  <div
                    key={payout.position}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                          payout.position === 1
                            ? "bg-yellow-100 text-yellow-800"
                            : payout.position === 2
                            ? "bg-gray-100 text-gray-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
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
                      <div className="text-xs text-gray-500">{payoutAmount.toFixed(2)} CUT</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary Prediction Payouts */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Prediction Payouts</h3>
              <div className="text-sm font-medium text-gray-600">
                ${Math.round(secondaryPrizePoolData.total).toLocaleString()}
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
                  <div className="font-semibold text-gray-900">Winner Take All</div>
                  <div className="text-xs text-gray-500">100%</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    ${Math.round(secondaryPrizePoolData.total).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {secondaryPrizePoolData.total.toFixed(2)} CUT
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
