import { Fragment, useMemo, useCallback } from "react";
import { Transition } from "@headlessui/react";

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
    [contest.address, createClaimEntryPayoutCalls, executePrimaryClaim]
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

  const hasPrimaryClaims = primaryClaims.some((claim) => claim.claimableAmount > 0n);
  const hasSecondaryClaim = Boolean(secondaryClaim && secondaryClaim.claimableAmount > 0n);
  const explorerBaseUrl =
    contest.chainId === 84532 ? "https://sepolia.basescan.org" : "https://basescan.org";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Contest Results</h3>
        {contest.results?.settleTx?.hash && (
          <a
            href={`${explorerBaseUrl}/tx/${contest.results.settleTx.hash}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            View Settlement Tx
          </a>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-sm p-3">
        {sortedResults.length === 0 ? (
          <p className="text-sm text-gray-500">Results not available.</p>
        ) : (
          <div className="space-y-3">
            {sortedResults.map((result, index) => (
              <div
                key={`${result.entryId}-${index}`}
                className="bg-white border border-gray-200 rounded-sm p-3 flex items-center gap-3"
              >
                <PositionBadge
                  position={result.position}
                  isInTheMoney={result.payoutBasisPoints > 0}
                  isUser={false}
                  primaryActionsLocked
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{result.username}</p>
                  <p className="text-xs text-gray-500 truncate">{result.lineupName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{result.score} pts</p>
                  <p className="text-xs text-gray-500">{result.payoutBasisPoints / 100}% payout</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Your Rewards</h4>
        <Transition
          as={Fragment}
          show={!isLoading}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-sm p-3">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Primary Entries
              </h5>
              {primaryClaims.length === 0 ? (
                <p className="text-sm text-gray-500 mt-1">
                  You did not enter this contest as a contestant.
                </p>
              ) : hasPrimaryClaims ? (
                <ul className="mt-2 space-y-2">
                  {primaryClaims.map((claim) => (
                    <li
                      key={claim.entryId}
                      className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-sm px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {claim.lineupName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {claim.claimableAmountFormatted} CUT available
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!claim.canClaim || isPrimaryProcessing}
                        className="bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-sm transition-colors"
                        onClick={() => {
                          void handlePrimaryClaim(claim.entryId);
                        }}
                      >
                        Claim
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 mt-1">All primary rewards have been claimed.</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-sm p-3">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Prediction Market
              </h5>
              {!secondaryClaim ? (
                <p className="text-sm text-gray-500 mt-1">
                  You did not hold the winning prediction token.
                </p>
              ) : hasSecondaryClaim ? (
                <div className="mt-2 flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-sm px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      Winning Entry #{secondaryClaim.entryId}
                    </p>
                    <p className="text-xs text-gray-500">
                      {secondaryClaim.claimableAmountFormatted} CUT available
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!secondaryClaim.canClaim || isSecondaryProcessing}
                    className="bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-sm transition-colors"
                    onClick={() => {
                      void handleSecondaryClaim();
                    }}
                  >
                    Claim
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">Prediction rewards already claimed.</p>
              )}
            </div>
          </div>
        </Transition>

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
