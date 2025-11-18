import React, { useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Modal } from "../common/Modal";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
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

  // Fetch secondary prize pool data
  const { secondaryTotalFundsFormatted, isLoading: isPredictionDataLoading } =
    useContestPredictionData({
      contestAddress: contest.address,
      entryIds: [],
      enabled: !!contest.address && !!contest.chainId && isOpen,
      chainId: contest.chainId,
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

  // Calculate total prize pool
  const totalPrizePool = useMemo(() => {
    const primary = primaryPrizePool ? Number(formatUnits(primaryPrizePool as bigint, 18)) : 0;
    const subsidy =
      primaryPrizePoolSubsidy && totalPrimaryPositionSubsidies
        ? Number(
            formatUnits(
              ((primaryPrizePoolSubsidy as bigint) +
                (totalPrimaryPositionSubsidies as bigint)) as bigint,
              18
            )
          )
        : 0;
    const secondary = parseFloat(secondaryTotalFundsFormatted || "0") || 0;
    return primary + subsidy + secondary;
  }, [
    primaryPrizePool,
    primaryPrizePoolSubsidy,
    totalPrimaryPositionSubsidies,
    secondaryTotalFundsFormatted,
  ]);

  const isLoading = isLoadingPrimary || isLoadingSubsidy || isPredictionDataLoading;

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
          {/* Prize Pool Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Total Prize Pool
            </h3>
            <div className="text-3xl font-bold text-gray-900">
              ${Math.round(totalPrizePool).toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {entryCount} {entryCount === 1 ? "entry" : "entries"}
            </div>
          </div>

          {/* Payout Structure */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payout Structure</h3>
            <div className="space-y-3">
              {payoutStructure.map((payout) => {
                const payoutAmount = (totalPrizePool * payout.percentage) / 100;
                return (
                  <div
                    key={payout.position}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-4 hover:border-blue-300 transition-colors"
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
                        <div className="text-xs text-gray-500">
                          {payout.percentage}% of prize pool
                        </div>
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

          {/* Current Standings (if contest is active/locked) */}
          {contest.status === "ACTIVE" || contest.status === "LOCKED" ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Standings</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <p className="text-sm text-gray-600">
                  Payouts will be calculated based on final scores after the contest ends. Current
                  standings are shown in the Results tab once the contest is settled.
                </p>
              </div>
            </div>
          ) : contest.status === "SETTLED" && contest.results ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Final Results</h3>
              <div className="space-y-2">
                {contest.results.detailedResults
                  .slice(0, Math.min(5, payoutStructure.length))
                  .map((result) => {
                    const payoutInfo = payoutStructure.find((p) => p.position === result.position);
                    const payoutAmount = payoutInfo
                      ? (totalPrizePool * payoutInfo.percentage) / 100
                      : 0;
                    return (
                      <div
                        key={result.entryId}
                        className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-gray-900">#{result.position}</div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {result.username}
                            </div>
                            <div className="text-xs text-gray-500">{result.lineupName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {result.score} pts
                          </div>
                          {payoutInfo && (
                            <div className="text-xs text-gray-500">
                              ${Math.round(payoutAmount).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Payouts are distributed based on final scores. In case of ties,
              payouts are split evenly among tied participants. Secondary market (prediction)
              payouts are winner-take-all and separate from primary contest payouts.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
};
