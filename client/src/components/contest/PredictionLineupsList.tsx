import React, { useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { simulateAddSecondaryPosition } from "@cut/secondary-pricing";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { useContestEvent } from "../../hooks/useContestEvent";
import { type Contest, areSecondaryActionsLocked } from "../../types/contest";
import { incrementalGlobalClaimDelta, toEnglishOdds } from "../../utils/secondaryPurchasePreview";
import { PredictionEntryModal } from "./PredictionEntryModal";
import {
  candidatesByParticipantIdMap,
  candidatesForLineupPicks,
  contestLineupDisplayName,
  lineupPicksFromContestLineup,
} from "../../lib/candidateUtils";
import { useCandidateSort } from "../../hooks/useCandidateSort";
import { participantLastName } from "../../lib/candidateSorting";

import { getLineupNumberLabel, resolveUserBorderColor } from "../../lib/lineupDisplay";

interface PredictionLineupsListProps {
  contest: Contest;
}

export const PredictionLineupsList: React.FC<PredictionLineupsListProps> = ({ contest }) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const { candidates = [], sportId, status } = useContestEvent(contest);
  const { sort } = useCandidateSort(sportId);
  const candidatesByParticipantId = useMemo(
    () => candidatesByParticipantIdMap(candidates),
    [candidates],
  );

  // Compute secondary actions lock based on contest status
  const secondaryActionsLocked = areSecondaryActionsLocked(contest.status);

  // Get entry IDs from contest lineups
  const entryIds = useMemo(() => {
    return (
      contest.contestLineups
        ?.filter((lineup) => lineup.entryId)
        .map((lineup) => lineup.entryId as string) || []
    );
  }, [contest.contestLineups]);

  // Fetch prediction data for all entries
  const {
    entryData,
    canPredict,
    isLoading,
    secondaryPrizePoolFormatted,
    secondaryTotalFundsFormatted,
    secondaryTotalFunds,
    poolSnapshot,
    paymentDecimals,
  } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds,
    enabled: true,
    chainId: contest.chainId,
    paymentTokenAddress: contest.settings?.paymentTokenAddress,
  });

  const canOpenLineupModal = canPredict && !secondaryActionsLocked;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinnerSmall />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {[...entryData]
          .sort((a, b) => parseFloat(b.priceFormatted) - parseFloat(a.priceFormatted))
          .map((entry) => {
            const lineup = contest.contestLineups?.find((l) => l.entryId === entry.entryId);
            const userName = lineup?.user?.name || lineup?.user?.email || "Unknown";
            const lineupName = lineup ? contestLineupDisplayName(lineup) : "";
            const lineupNumberLabel = getLineupNumberLabel(lineupName);
            const tenDollarReturnLabel = (() => {
              if (!poolSnapshot) return "—";

              let tenDollarAmount: bigint;
              try {
                tenDollarAmount = parseUnits("10", paymentDecimals);
              } catch {
                return "—";
              }

              const sim = simulateAddSecondaryPosition({
                amount: tenDollarAmount,
                entryShares: entry.totalSupply,
                entryLiquidity: entry.entryLiquidity,
                ...poolSnapshot,
              });

              const deltaWei = incrementalGlobalClaimDelta(
                secondaryTotalFunds,
                tenDollarAmount,
                entry.balance,
                entry.totalSupply,
                sim,
              );
              if (deltaWei === null) return "—";
              const impliedRaw = Number(formatUnits(deltaWei, paymentDecimals));
              if (!Number.isFinite(impliedRaw)) return "—";
              return impliedRaw.toFixed(2);
            })();
            const tenDollarEnglishOdds = (() => {
              const projectedReturn = Number.parseFloat(tenDollarReturnLabel);
              if (!Number.isFinite(projectedReturn)) return "—";
              return toEnglishOdds(10, projectedReturn);
            })();

            const userSettings = lineup?.user?.settings;
            const maybeColor =
              typeof userSettings === "object" && userSettings !== null
                ? (userSettings as { color?: unknown }).color
                : undefined;
            const resolvedLeftBorderColor = resolveUserBorderColor(maybeColor);

            return (
              <div
                key={entry.entryId}
                onClick={() => canOpenLineupModal && setSelectedEntryId(entry.entryId)}
                className={`bg-white rounded-none border-0 border-l border-t border-r border-b border-gray-200 p-3 font-display ${
                  canOpenLineupModal
                    ? "cursor-pointer hover:shadow-md"
                    : "opacity-60 cursor-not-allowed"
                } transition-all`}
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
                      {lineupNumberLabel && (
                        <span className="ml-1 text-xs font-medium text-gray-500 sm:text-sm">
                          {lineupNumberLabel}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {(() => {
                        if (!lineup) return "No players";
                        const lineupCandidates = candidatesForLineupPicks(
                          lineupPicksFromContestLineup(lineup),
                          candidatesByParticipantId,
                        );
                        const sortedPlayerNames = sort(lineupCandidates, "lineupPicks", status)
                          .map((candidate) => participantLastName(candidate))
                          .join(", ");

                        return sortedPlayerNames || lineupName || "No players";
                      })()}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums text-emerald-600 leading-none mb-0.5">
                        {tenDollarEnglishOdds}
                      </div>
                      <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none">
                        Odds
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <PredictionEntryModal
        isOpen={!!selectedEntryId}
        onClose={() => setSelectedEntryId(null)}
        contest={contest}
        entryId={selectedEntryId}
        entryData={entryData}
        secondaryPrizePoolFormatted={secondaryPrizePoolFormatted}
        secondaryTotalFundsFormatted={secondaryTotalFundsFormatted}
        totalSecondaryLiquidityBefore={secondaryTotalFunds}
        poolSnapshot={poolSnapshot}
      />
    </div>
  );
};
