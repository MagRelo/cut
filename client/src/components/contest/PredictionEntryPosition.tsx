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
  userName,
  lineupName,
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

  const deposited = parseFloat(entry.secondaryDepositedFormatted);
  const depositedDisplay =
    !Number.isFinite(deposited) || deposited <= 0
      ? "0.00"
      : deposited < 0.01
        ? "< 0.01"
        : deposited.toFixed(2);

  const ownershipPercent =
    entry.totalSupply > 0n ? Number((entry.balance * 10000n) / entry.totalSupply) / 100 : 0;
  const ownershipDisplay =
    !Number.isFinite(ownershipPercent) || ownershipPercent <= 0
      ? "0.00"
      : ownershipPercent < 0.01
        ? "< 0.01"
        : ownershipPercent.toFixed(2);

  const impliedWinnings = parseFloat(entry.impliedWinningsFormatted ?? "0");
  const impliedDisplay =
    !Number.isFinite(impliedWinnings) || impliedWinnings < 0
      ? "0.00"
      : impliedWinnings < 0.01
        ? "< 0.01"
        : impliedWinnings.toFixed(2);

  const handleWithdraw = async () => {
    if (!canWithdraw) return;

    setError(null);
    setWithdrawing(true);

    try {
      const calls = createWithdrawPredictionCalls(
        contest.address,
        Number.parseInt(entry.entryId, 10),
        entry.balance,
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
      <div className="rounded-none border border-gray-200 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-semibold text-gray-900">{userName}</div>
            <div className="truncate text-xs text-gray-500">{lineupName}</div>
          </div>

          <div className="flex min-w-[4rem] shrink-0 flex-col items-center justify-center gap-0.5 text-center">
            <div className="text-xs font-medium text-gray-500 leading-tight tabular-nums">
              ${depositedDisplay}
            </div>
            <div className="text-[10px] font-medium uppercase leading-none tracking-wide text-gray-400">
              Cost
            </div>
          </div>

          <div className="flex min-w-[4rem] shrink-0 flex-col items-center justify-center gap-0.5 text-center">
            <div className="text-xs font-medium text-gray-500 leading-tight tabular-nums">
              {ownershipDisplay}%
            </div>
            <div className="text-[10px] font-medium uppercase leading-none tracking-wide text-gray-400">
              Own %
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center text-center">
            <div className="text-lg font-bold leading-none tabular-nums text-green-600">
              ${impliedDisplay}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
              Value
            </div>
          </div>
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
    </div>
  );
};
