import { useMemo, useCallback } from "react";
import { formatUnits } from "viem";

import { useContestSettlementClaims } from "../../hooks/useContestSettlementClaims";
import type { Contest } from "../../types/contest";
import { PositionBadge } from "./PositionBadge";
import { useClaimEntryPayout } from "../../hooks/useContestantOperations";
import { useClaimPredictionPayout } from "../../hooks/useSpectatorOperations";

interface ContestResultsPanelProps {
  contest: Contest;
  onRefreshContest?: () => Promise<unknown>;
}

export const ContestResultsPanel: React.FC<ContestResultsPanelProps> = ({
  contest,
  onRefreshContest,
}) => {
  const formatTokenAmount = (valueWei: bigint, fractionDigits = 2) => {
    const valueStr = formatUnits(valueWei, 18);
    const [whole, fraction = ""] = valueStr.split(".");
    const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (fractionDigits <= 0) return wholeWithCommas;
    const fixedFraction = fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits);
    return `${wholeWithCommas}.${fixedFraction}`;
  };

  const { primaryClaims, secondaryClaim, isLoading, refetchPrimary } = useContestSettlementClaims({
    contest,
    contestLineups: contest.contestLineups,
  });

  const refreshClaims = useCallback(async () => {
    const tasks: Array<Promise<unknown>> = [];
    if (refetchPrimary) {
      tasks.push(refetchPrimary());
    }
    if (onRefreshContest) {
      tasks.push(onRefreshContest());
    }
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }, [onRefreshContest, refetchPrimary]);

  const {
    execute: executePrimaryClaim,
    isProcessing: isPrimaryProcessing,
    error: primaryError,
    createClaimEntryPayoutCalls,
  } = useClaimEntryPayout({
    onSuccess: async () => {
      await refreshClaims();
    },
  });

  const {
    execute: executeSecondaryClaim,
    isProcessing: isSecondaryProcessing,
    error: secondaryError,
    createClaimPredictionPayoutCalls,
  } = useClaimPredictionPayout({
    onSuccess: async () => {
      await refreshClaims();
    },
  });

  const handlePrimaryClaim = useCallback(
    async (entryId: string) => {
      if (!contest.address) return;
      const numericEntryId = Number(entryId);
      if (Number.isNaN(numericEntryId)) {
        console.warn("Unable to parse entryId for claim", entryId);
        return;
      }
      const calls = createClaimEntryPayoutCalls(contest.address, numericEntryId);
      await executePrimaryClaim(calls);
    },
    [contest.address, createClaimEntryPayoutCalls, executePrimaryClaim],
  );

  const handleSecondaryClaim = useCallback(async () => {
    if (!contest.address || !secondaryClaim) return;
    const numericEntryId = Number(secondaryClaim.entryId);
    if (Number.isNaN(numericEntryId)) {
      console.warn("Unable to parse secondary entryId for claim", secondaryClaim.entryId);
      return;
    }
    const calls = createClaimPredictionPayoutCalls(contest.address, numericEntryId);
    await executeSecondaryClaim(calls);
  }, [contest.address, secondaryClaim, createClaimPredictionPayoutCalls, executeSecondaryClaim]);

  const sortedResults = useMemo(() => {
    return [...(contest.results?.detailedResults ?? [])].sort((a, b) => a.position - b.position);
  }, [contest.results?.detailedResults]);

  const inTheMoneyResults = useMemo(() => {
    return sortedResults.filter((result) => result.payoutBasisPoints > 0);
  }, [sortedResults]);

  const layer1PoolWei = useMemo(() => {
    const snapshot = contest.results?.snapshot;
    if (!snapshot) return null;
    try {
      if (snapshot.primaryPrizePoolSubsidy !== undefined) {
        return BigInt(snapshot.primaryPrizePool) + BigInt(snapshot.primaryPrizePoolSubsidy);
      }
      return BigInt(snapshot.primaryPrizePool);
    } catch {
      return null;
    }
  }, [contest.results?.snapshot]);

  const hasSecondaryClaim = Boolean(secondaryClaim && secondaryClaim.claimableAmount > 0n);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Contest Results</h3>
      </div>
      <div className="">
        {inTheMoneyResults.length === 0 ? (
          <p className="text-sm text-gray-500">Results not available.</p>
        ) : (
          <div className="space-y-3">
            {inTheMoneyResults.map((result, index) => (
              <div
                key={`${result.entryId}-${index}`}
                className="bg-white border border-gray-200 rounded-sm p-3 flex items-center gap-3"
                style={{
                  borderLeftWidth: "3px",
                  borderLeftStyle: "solid",
                  borderLeftColor: result.userColor ?? undefined,
                }}
              >
                <PositionBadge
                  position={result.position}
                  isInTheMoney={result.payoutBasisPoints > 0}
                  isUser={false}
                  primaryActionsLocked
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{result.username}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {result.playerLastNames?.length
                      ? result.playerLastNames.join(", ")
                      : result.lineupName}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="text-right">
                    {layer1PoolWei ? (
                      <>
                        <div className="text-lg font-bold text-green-600 leading-none tabular-nums">
                          $
                          {formatTokenAmount(
                            (layer1PoolWei * BigInt(Math.floor(result.payoutBasisPoints))) / 10000n,
                          )}
                        </div>
                        <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                          {result.score} pts
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        {!isLoading && (
          <div className="space-y-3">
            <div className="">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Contest Rewards
              </h4>
              <ul className="mt-2 space-y-2">
                {primaryClaims.map((claim) => (
                  <li
                    key={claim.entryId}
                    className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-sm px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {claim.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {claim.playerLastNames?.length
                          ? claim.playerLastNames.join(", ")
                          : claim.lineupName}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* payout amount */}
                      <div className="text-right">
                        <div className="text-md font-bold text-green-600 leading-none tabular-nums">
                          ${formatTokenAmount(claim.payoutAmount, 2)}
                        </div>
                        <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                          payout
                        </div>
                      </div>

                      {/* claim button */}
                      <button
                        type="button"
                        disabled={!claim.canClaim || isPrimaryProcessing}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-sm transition-colors"
                        onClick={() => {
                          void handlePrimaryClaim(claim.entryId);
                        }}
                      >
                        {!claim.canClaim && claim.payoutAmount > 0n ? "Claimed" : "Claim"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Winner Pool Rewards
              </h4>
              {!secondaryClaim ? (
                <p className="text-sm text-gray-500 mt-1">
                  You did not hold the winning prediction token.
                </p>
              ) : hasSecondaryClaim ? (
                <div className="mt-2 flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-sm px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      Winner Pool Ticket
                    </p>
                    <p className="text-xs text-gray-500">#{secondaryClaim.entryId}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* amount to claim */}
                    <div className="text-right">
                      <div className="text-md font-bold text-green-600 leading-none tabular-nums">
                        ${formatTokenAmount(secondaryClaim.claimableAmount, 2)}
                      </div>
                      <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                        payout
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!secondaryClaim.canClaim || isSecondaryProcessing}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-sm transition-colors"
                      onClick={() => {
                        void handleSecondaryClaim();
                      }}
                    >
                      Claim
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1"></p>
              )}
            </div>
          </div>
        )}

        {isLoading && <p className="text-xs text-gray-500 mt-2">Loading claim data...</p>}
        {(primaryError || secondaryError) && (
          <p className="text-xs text-red-500 mt-2">{primaryError || secondaryError}</p>
        )}
        {(isPrimaryProcessing || isSecondaryProcessing) && (
          <p className="text-xs text-gray-500 mt-1">Processing transaction...</p>
        )}
      </div>
    </div>
  );
};
