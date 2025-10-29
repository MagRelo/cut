import React, { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useWithdrawPrediction } from "../../hooks/useSpectatorOperations";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { type Contest } from "../../types/contest";

interface PredictionPositionsListProps {
  contest: Contest;
}

export const PredictionPositionsList: React.FC<PredictionPositionsListProps> = ({ contest }) => {
  const { address: userAddress } = useAccount();
  const [withdrawingEntryId, setWithdrawingEntryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get entry IDs from contest lineups
  const entryIds = useMemo(() => {
    return (
      contest.contestLineups
        ?.filter((lineup) => lineup.entryId)
        .map((lineup) => lineup.entryId as string) || []
    );
  }, [contest.contestLineups]);

  // Fetch prediction data
  const { entryData, canWithdraw, isLoading } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds,
    enabled: !!userAddress,
    chainId: contest.chainId,
  });

  // Filter to only show entries where user has a position
  const userPositions = useMemo(() => {
    return entryData.filter((entry) => entry.hasPosition);
  }, [entryData]);

  // Blockchain transaction hook
  const { execute, isProcessing, createWithdrawPredictionCalls } = useWithdrawPrediction({
    onSuccess: async () => {
      setWithdrawingEntryId(null);
      setError(null);
    },
    onError: (err) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setWithdrawingEntryId(null);
    },
  });

  const handleWithdraw = async (entryId: string, tokenAmount: bigint) => {
    setError(null);
    setWithdrawingEntryId(entryId);

    try {
      const calls = createWithdrawPredictionCalls(contest.address, parseInt(entryId), tokenAmount);
      await execute(calls);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setWithdrawingEntryId(null);
    }
  };

  if (!userAddress) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-600 text-sm font-display">
          Connect your wallet to view your prediction positions.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinnerSmall />
      </div>
    );
  }

  if (userPositions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-600 text-sm font-display">
          You haven't placed any predictions yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-2 font-display px-2 pt-4">
        Your Predictions
      </h3>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {userPositions.map((position) => {
          const lineup = contest.contestLineups?.find((l) => l.entryId === position.entryId);
          const userName = lineup?.user?.name || "Unknown";
          const lineupName = lineup?.tournamentLineup?.name || "Lineup";
          const isWithdrawing = withdrawingEntryId === position.entryId;

          // Calculate ownership share percentage
          const ownershipShare =
            position.totalSupply > 0n
              ? (Number(position.balance) / Number(position.totalSupply)) * 100
              : 0;

          return (
            <div key={position.entryId} className="p-4 border border-gray-300 rounded-sm mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-md font-semibold text-gray-900 truncate leading-tight font-display">
                    {userName}
                  </div>
                  <div className="text-xs text-gray-600 truncate leading-6">{lineupName}</div>
                </div>
                <div className="flex items-center px-2 py-1 bg-purple-100 rounded text-purple-700 text-xs font-semibold">
                  ✓ Active
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Outcome Ownership:</span>
                  <span className="font-semibold text-gray-600">
                    {ownershipShare < 0.01 ? "< 0.01" : ownershipShare.toFixed(2)}%
                  </span>
                </div>

                {parseFloat(position.impliedWinningsFormatted) > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600"> Estimated Share Value:</span>
                    <span className="font-semibold text-green-600">
                      ~$
                      {parseFloat(position.impliedWinningsFormatted) < 0.01
                        ? "< 0.01"
                        : parseFloat(position.impliedWinningsFormatted).toFixed(2)}{" "}
                    </span>
                  </div>
                )}
              </div>
              {/* 
              <div className="text-center text-xs text-gray-500 mt-2">
                Entry #{position.entryId}
              </div> */}

              {/* Withdraw Button */}
              {canWithdraw && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <button
                    onClick={() => handleWithdraw(position.entryId, position.balance)}
                    disabled={isProcessing}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-display font-semibold transition-colors"
                  >
                    {isWithdrawing ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinnerSmall />
                        Withdrawing...
                      </span>
                    ) : (
                      "Withdraw"
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 pb-4 text-xs text-gray-500 border-t border-gray-200 pt-4 mt-2">
        <p>
          <strong>Note:</strong> Current value is calculated using live LMSR pricing. Actual payout
          depends on contest settlement.
        </p>
      </div>
    </div>
  );
};
