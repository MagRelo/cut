import React, { useState, useMemo } from "react";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { TxButton } from "../common/TxButton";
import { useWithdrawPrediction } from "../../hooks/useSpectatorOperations";
import { ContestState, useContestPredictionData } from "../../hooks/useContestPredictionData";
import { useEffectiveWalletAddress } from "../../hooks/useEffectiveWalletAddress";
import { type Contest } from "../../types/contest";
import { useOddsFormat } from "../../hooks/useOddsFormat";
import { contestLineupDisplayName } from "../../lib/candidateUtils";

import { resolveUserBorderColor } from "../../lib/lineupDisplay";

interface PredictionPositionsListProps {
  contest: Contest;
}

export const PredictionPositionsList: React.FC<PredictionPositionsListProps> = ({ contest }) => {
  const userAddress = useEffectiveWalletAddress();
  const { formatStakeReturnOdds } = useOddsFormat();
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
  const { entryData, canWithdraw, contestState, isLoading } = useContestPredictionData({
    contestAddress: contest.address ?? "",
    entryIds,
    enabled: !!userAddress,
    chainId: contest.chainId,
    paymentTokenAddress: contest.settings?.paymentTokenAddress,
  });

  const isCancelled = contestState === ContestState.CANCELLED;

  // Filter to only show entries where user has a position
  const userPositions = useMemo(() => {
    return entryData.filter((entry) => entry.hasPosition);
  }, [entryData]);

  // Blockchain transaction hook
  const {
    execute,
    retrySave,
    phase,
    error: transactionError,
    createWithdrawPredictionCalls,
  } = useWithdrawPrediction();

  const handleWithdraw = async (entryId: string, tokenAmount: bigint, paymentAmount: bigint) => {
    if (phase === "recordFailed" && withdrawingEntryId === entryId) {
      await retrySave();
      return;
    }
    const tokenAddress = contest.settings?.paymentTokenAddress;
    if (!userAddress || !contest.address || !tokenAddress) {
      setError("Wallet not connected");
      return;
    }
    setError(null);
    setWithdrawingEntryId(entryId);

    const calls = createWithdrawPredictionCalls(contest.address, parseInt(entryId), tokenAmount);
    const outcome = await execute(calls, {
      kind: "WITHDRAW",
      tokenAddress: tokenAddress as `0x${string}`,
      amountWei: paymentAmount.toString(),
      from: contest.address as `0x${string}`,
      to: userAddress,
      contestId: contest.id,
      entryId,
    });
    if (outcome === "idle") setWithdrawingEntryId(null);
  };

  if (!userAddress) {
    return (
      <div className="bg-gray-50 border border-slate-300 rounded-lg p-4 text-center">
        <p className="text-gray-600 text-sm font-display">
          Connect your wallet to view your wagers.
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
      <div className=" p-4 text-center">
        <p className="text-gray-400 text-sm font-display">No active wagers</p>
      </div>
    );
  }

  return (
    <div>
      {error || (phase === "idle" && transactionError) ? (
        <ErrorMessage message={error || transactionError || ""} className="mb-4" />
      ) : null}

      <div className="space-y-2">
        {userPositions.map((position) => {
          const lineup = contest.contestLineups?.find((l) => l.entryId === position.entryId);
          const userName = lineup?.user?.name || lineup?.user?.email || "Unknown";
          const lineupName = lineup ? contestLineupDisplayName(lineup) : "Lineup";
          const isActive = withdrawingEntryId === position.entryId;
          const rowPhase = isActive ? phase : "idle";

          const userSettings = lineup?.user?.settings;
          const maybeColor =
            typeof userSettings === "object" && userSettings !== null
              ? (userSettings as { color?: unknown }).color
              : undefined;
          const resolvedLeftBorderColor = resolveUserBorderColor(maybeColor);

          const deposited = parseFloat(position.secondaryDepositedFormatted);
          const depositedDisplay =
            !Number.isFinite(deposited) || deposited <= 0
              ? "0.00"
              : deposited < 0.01
                ? "< 0.01"
                : deposited.toFixed(2);

          const impliedWinnings = parseFloat(position.impliedWinningsFormatted);
          const payoutAmount = isCancelled ? deposited : impliedWinnings;
          const payoutDisplay =
            !Number.isFinite(payoutAmount) || payoutAmount < 0
              ? "0.00"
              : payoutAmount < 0.01
                ? "< 0.01"
                : payoutAmount.toFixed(2);
          const oddsDisplay = isCancelled
            ? "—"
            : formatStakeReturnOdds(deposited, impliedWinnings);

          return (
            <div
              key={position.entryId}
              className="rounded-sm border-0 border-b border-l border-r border-t border-slate-300 bg-white p-3 font-display shadow-sm"
              style={{
                borderLeftColor: resolvedLeftBorderColor,
                borderLeftWidth: "5px",
                borderLeftStyle: "solid",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-gray-900 truncate leading-tight sm:text-lg">
                    {userName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{lineupName}</div>
                </div>

                <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[3rem] gap-0.5 font-sans">
                  <div className="text-xs font-medium text-gray-700 leading-tight tabular-nums">
                    ${depositedDisplay}
                  </div>
                  <div className="text-[10px] uppercase text-gray-500 font-medium tracking-wide leading-none">
                    Stake
                  </div>
                </div>

                {!isCancelled && (
                  <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[3rem] gap-0.5 font-sans">
                    <div className="text-xs font-medium text-gray-700 leading-tight tabular-nums">
                      {oddsDisplay}
                    </div>
                    <div className="text-[10px] uppercase text-gray-500 font-medium tracking-wide leading-none">
                      Odds
                    </div>
                  </div>
                )}

                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="text-right font-sans">
                    <div className="text-lg font-bold tabular-nums text-emerald-600 leading-none">
                      ${payoutDisplay}
                    </div>
                    <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                      {isCancelled ? "refund" : "return"}
                    </div>
                  </div>
                </div>
              </div>

              {canWithdraw && (
                <div className="mt-3 border-t border-slate-300 pt-3">
                  <TxButton
                    phase={rowPhase}
                    idleLabel={isCancelled ? "Withdraw refund" : "Withdraw"}
                    onClick={() =>
                      void handleWithdraw(
                        position.entryId,
                        position.balance,
                        position.secondaryDepositedPerEntry,
                      )
                    }
                    disabled={phase !== "idle" && phase !== "confirmed" && !isActive}
                    error={
                      isActive && (rowPhase === "chainFailed" || rowPhase === "recordFailed")
                        ? transactionError
                        : null
                    }
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-display font-semibold transition-colors"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
