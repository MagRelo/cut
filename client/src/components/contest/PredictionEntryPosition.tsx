import React, { useState } from "react";
import { type Contest } from "../../types/contest";
import { type PredictionEntryData } from "./PredictionEntryForm";
import { useWithdrawPrediction } from "../../hooks/useSpectatorOperations";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

interface PredictionEntryPositionProps {
  contest: Contest;
  entry: PredictionEntryData;
  canWithdraw: boolean;
  userName: string;
  lineupName: string;
}

export const PredictionEntryPosition: React.FC<PredictionEntryPositionProps> = ({
  contest,
  entry,
  canWithdraw,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const { execute, isProcessing, createWithdrawPredictionCalls } = useWithdrawPrediction({
    onSuccess: async () => {
      setWithdrawing(false);
      setError(null);
    },
    onError: (err) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setWithdrawing(false);
    },
  });

  const ownershipShare =
    entry.totalSupply > 0n ? (Number(entry.balance) / Number(entry.totalSupply)) * 100 : 0;

  const shareValue = Number.parseFloat(entry.impliedWinningsFormatted ?? "0");

  const handleWithdraw = async () => {
    if (!canWithdraw) return;

    setError(null);
    setWithdrawing(true);

    try {
      const calls = createWithdrawPredictionCalls(
        contest.address,
        Number.parseInt(entry.entryId, 10),
        entry.balance
      );

      await execute(calls);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-3 h-[269px]">
      <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-md p-4 text-sm">
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Outcome Share</span>
            <span className="font-semibold text-gray-900">
              {ownershipShare < 0.01 ? "< 0.01" : ownershipShare.toFixed(2)}%
            </span>
          </div>

          {shareValue > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Current Share Value</span>
              <span className="font-semibold text-green-600">
                ~${shareValue < 0.01 ? "< 0.01" : shareValue.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {canWithdraw && (
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={isProcessing || withdrawing}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-display font-semibold transition-colors"
          >
            {isProcessing || withdrawing ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinnerSmall />
                Cancelling...
              </span>
            ) : (
              "Cancel Position"
            )}
          </button>
        </div>
      )}

      <div className="text-xs text-gray-500 border-t border-gray-200 pt-2">
        <p>
          <strong>Note:</strong> Final payouts are calculated based on overall participant activity.
        </p>
      </div>
    </div>
  );
};
