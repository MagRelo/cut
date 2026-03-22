import React, { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useWithdrawPrediction } from "../../hooks/useSpectatorOperations";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { type Contest } from "../../types/contest";

const DEFAULT_USER_COLOR = "#9CA3AF";

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

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
      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2 mt-2">
        {userPositions.map((position) => {
          const lineup = contest.contestLineups?.find((l) => l.entryId === position.entryId);
          const userName = lineup?.user?.name || lineup?.user?.email || "Unknown";
          const lineupName = lineup?.tournamentLineup?.name || "Lineup";
          const isWithdrawing = withdrawingEntryId === position.entryId;

          const userSettings = lineup?.user?.settings;
          const maybeColor =
            typeof userSettings === "object" && userSettings !== null
              ? (userSettings as { color?: unknown }).color
              : undefined;
          const resolvedLeftBorderColor = isValidHexColor(maybeColor)
            ? maybeColor
            : DEFAULT_USER_COLOR;

          const ownershipShare =
            position.totalSupply > 0n
              ? (Number(position.balance) / Number(position.totalSupply)) * 100
              : 0;

          const impliedWinnings = parseFloat(position.impliedWinningsFormatted);
          const impliedDisplay =
            !Number.isFinite(impliedWinnings) || impliedWinnings < 0
              ? "0.00"
              : impliedWinnings < 0.01
                ? "< 0.01"
                : impliedWinnings.toFixed(2);

          return (
            <div
              key={position.entryId}
              className="bg-white rounded-none border-0 border-l border-t border-r border-b border-gray-200 p-3"
              style={{
                borderLeftColor: resolvedLeftBorderColor,
                borderLeftWidth: "3px",
                borderLeftStyle: "solid",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{userName}</div>
                  <div className="text-xs text-gray-500 truncate">{lineupName}</div>
                </div>

                <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] gap-0.5">
                  <div className="text-xs font-medium text-gray-500 leading-tight tabular-nums">
                    {ownershipShare < 0.01 ? "< 0.01" : ownershipShare.toFixed(2)}%
                  </div>
                  <div className="text-[10px] uppercase text-gray-400 font-medium tracking-wide leading-none">
                    Share
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 leading-none tabular-nums">
                      ${impliedDisplay}
                    </div>
                    <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                      Value
                    </div>
                  </div>
                </div>
              </div>

              {canWithdraw && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <button
                    type="button"
                    onClick={() => handleWithdraw(position.entryId, position.balance)}
                    disabled={isProcessing}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-display font-semibold transition-colors"
                  >
                    {isWithdrawing ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinnerSmall />
                        Cancelling...
                      </span>
                    ) : (
                      "Cancel"
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
