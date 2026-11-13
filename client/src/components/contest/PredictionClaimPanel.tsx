import React, { useState, useMemo } from "react";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { TxButton } from "../common/TxButton";
import { useEffectiveWalletAddress } from "../../hooks/useEffectiveWalletAddress";
import { useClaimPredictionPayout } from "../../hooks/useSpectatorOperations";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { type Contest } from "../../types/contest";
import { contestLineupDisplayName } from "../../lib/candidateUtils";

interface PredictionClaimPanelProps {
  contest: Contest;
}

export const PredictionClaimPanel: React.FC<PredictionClaimPanelProps> = ({ contest }) => {
  const userAddress = useEffectiveWalletAddress();
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
    contestAddress: contest.address ?? "",
    entryIds,
    enabled: !!userAddress,
    chainId: contest.chainId,
    paymentTokenAddress: contest.settings?.paymentTokenAddress,
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
        lineup.user?.name === winner.username && contestLineupDisplayName(lineup) === winner.lineupName
    );

    return winningLineup?.entryId || null;
  }, [contest.results, contest.contestLineups]);

  // Blockchain transaction hook
  const {
    execute,
    retrySave,
    phase,
    error: transactionError,
    createClaimPredictionPayoutCalls,
  } = useClaimPredictionPayout();

  const handleClaim = async (entryId: string) => {
    if (phase === "recordFailed" && claimingEntryId === entryId) {
      await retrySave();
      return;
    }
    const tokenAddress = contest.settings?.paymentTokenAddress;
    if (!userAddress || !contest.address || !tokenAddress) {
      setError("Wallet not connected");
      return;
    }
    setError(null);
    setClaimingEntryId(entryId);

    const calls = createClaimPredictionPayoutCalls(contest.address, parseInt(entryId));
    const outcome = await execute(calls, {
      kind: "SECONDARY",
      tokenAddress: tokenAddress as `0x${string}`,
      from: contest.address as `0x${string}`,
      to: userAddress,
      contestId: contest.id,
      entryId,
    });
    if (outcome === "idle") setClaimingEntryId(null);
  };

  if (!canClaim) {
    return null;
  }

  if (!userAddress) {
    return (
      <div className="bg-gray-50 border border-slate-300 rounded-lg p-4 text-center">
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
      <div className="bg-gray-50 border border-slate-300 rounded-lg p-4 text-center">
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

      {error || (phase === "idle" && transactionError) ? (
        <ErrorMessage message={error || transactionError || ""} className="mx-4 mb-4" />
      ) : null}

      {/* Winning Positions */}
      {winningPositions.length > 0 && (
        <div className="mb-4">
          <div className="px-4 py-2 bg-green-50 border-b border-green-200">
            <h4 className="text-sm font-semibold text-green-800 font-display">
              🎉 Winning Predictions
            </h4>
          </div>

          <div className="divide-y divide-slate-300">
            {winningPositions.map((position) => {
              const lineup = contest.contestLineups?.find((l) => l.entryId === position.entryId);
              const userName = lineup?.user?.name || "Unknown";
              const lineupName = lineup ? contestLineupDisplayName(lineup) : "Lineup";

              const isActive = claimingEntryId === position.entryId;
              const rowPhase = isActive ? phase : "idle";

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
                    You predicted correctly. Claim your payout from the parimutuel pool.
                  </div>

                  <TxButton
                    phase={rowPhase}
                    idleLabel="Claim Winnings"
                    onClick={() => void handleClaim(position.entryId)}
                    disabled={phase !== "idle" && phase !== "confirmed" && !isActive}
                    error={
                      isActive && (rowPhase === "chainFailed" || rowPhase === "recordFailed")
                        ? transactionError
                        : null
                    }
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-display font-semibold transition-colors"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Losing Positions */}
      {losingPositions.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b border-slate-300">
            <h4 className="text-sm font-semibold text-gray-700 font-display">
              Unsuccessful Predictions
            </h4>
          </div>

          <div className="divide-y divide-slate-300">
            {losingPositions.map((position) => {
              const lineup = contest.contestLineups?.find((l) => l.entryId === position.entryId);
              const userName = lineup?.user?.name || "Unknown";
              const lineupName = lineup ? contestLineupDisplayName(lineup) : "Lineup";

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

      <div className="px-4 pb-4 text-xs text-gray-500 border-t border-slate-300 pt-4 mt-2">
        <p>
          <strong>Winner-Take-All:</strong> Only predictions on the winning entry receive payouts.
          Payout size is proportional to your winning ticket holdings.
        </p>
      </div>
    </div>
  );
};
