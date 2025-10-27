import React, { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useClaimPredictionPayout } from "../../hooks/useSpectatorOperations";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { type Contest } from "../../types/contest";

interface PredictionClaimPanelProps {
  contest: Contest;
}

export const PredictionClaimPanel: React.FC<PredictionClaimPanelProps> = ({ contest }) => {
  const { address: userAddress } = useAccount();
  const [claimingEntryId, setClaimingEntryId] = useState<string | null>(null);
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
  const { entryData, canClaim, isLoading } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds,
    enabled: !!userAddress,
  });

  // Filter to only show entries where user has a position
  const userPositions = useMemo(() => {
    return entryData.filter((entry) => entry.hasPosition);
  }, [entryData]);

  // Get winning entry from contest results
  const winningEntryId = useMemo(() => {
    if (!contest.results?.detailedResults || contest.results.detailedResults.length === 0) {
      return null;
    }
    // Winner is position 1
    const winner = contest.results.detailedResults.find((result) => result.position === 1);
    if (!winner) return null;

    // Find the lineup that matches this winner
    const winningLineup = contest.contestLineups?.find(
      (lineup) =>
        lineup.user?.name === winner.username && lineup.tournamentLineup?.name === winner.lineupName
    );

    return winningLineup?.entryId || null;
  }, [contest.results, contest.contestLineups]);

  // Blockchain transaction hook
  const { execute, isProcessing, createClaimPredictionPayoutCalls } = useClaimPredictionPayout({
    onSuccess: async () => {
      setClaimingEntryId(null);
      setError(null);
    },
    onError: (err) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setClaimingEntryId(null);
    },
  });

  const handleClaim = async (entryId: string) => {
    setError(null);
    setClaimingEntryId(entryId);

    try {
      const calls = createClaimPredictionPayoutCalls(contest.address, parseInt(entryId));
      await execute(calls);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setClaimingEntryId(null);
    }
  };

  if (!canClaim) {
    return null;
  }

  if (!userAddress) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-600 text-sm font-display">
          Connect your wallet to claim your winnings.
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
          You didn't place any predictions in this contest.
        </p>
      </div>
    );
  }

  // Separate winning and losing positions
  const winningPositions = userPositions.filter((pos) => pos.entryId === winningEntryId);
  const losingPositions = userPositions.filter((pos) => pos.entryId !== winningEntryId);

  return (
    <div className="bg-white rounded-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 font-display px-4 pt-4">
        Claim Prediction Winnings
      </h3>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Winning Positions */}
      {winningPositions.length > 0 && (
        <div className="mb-4">
          <div className="px-4 py-2 bg-green-50 border-b border-green-200">
            <h4 className="text-sm font-semibold text-green-800 font-display">
              🎉 Winning Predictions
            </h4>
          </div>

          <div className="divide-y divide-gray-200">
            {winningPositions.map((position) => {
              const lineup = contest.contestLineups?.find((l) => l.entryId === position.entryId);
              const userName = lineup?.user?.name || "Unknown";
              const lineupName = lineup?.tournamentLineup?.name || "Lineup";

              const isClaiming = claimingEntryId === position.entryId;

              return (
                <div key={position.entryId} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-gray-900 font-display">
                        {userName} - {lineupName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Entry #{position.entryId}</div>
                    </div>
                  </div>

                  <div className="text-sm mt-2 mb-4 text-gray-600">
                    You predicted correctly! Claim your share of the winner's pot.
                  </div>

                  <button
                    onClick={() => handleClaim(position.entryId)}
                    disabled={isProcessing}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-display font-semibold transition-colors"
                  >
                    {isClaiming ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinnerSmall />
                        Claiming...
                      </span>
                    ) : (
                      "Claim Winnings"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Losing Positions */}
      {losingPositions.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 font-display">
              Unsuccessful Predictions
            </h4>
          </div>

          <div className="divide-y divide-gray-200">
            {losingPositions.map((position) => {
              const lineup = contest.contestLineups?.find((l) => l.entryId === position.entryId);
              const userName = lineup?.user?.name || "Unknown";
              const lineupName = lineup?.tournamentLineup?.name || "Lineup";

              return (
                <div key={position.entryId} className="p-4 bg-gray-50">
                  <div>
                    <div className="font-semibold text-gray-700 font-display">
                      {userName} - {lineupName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Entry #{position.entryId}</div>
                    <div className="mt-2 text-xs text-gray-500">
                      This entry didn't win. No payout (winner-take-all).
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 pb-4 text-xs text-gray-500 border-t border-gray-200 pt-4 mt-2">
        <p>
          <strong>Winner-Take-All:</strong> Only predictions on the winning entry receive payouts.
          Your share is proportional to your token holdings.
        </p>
      </div>
    </div>
  );
};
