import React, { useMemo, useState } from "react";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { useEventScope } from "../../contexts/EventScopeContext";
import { type Contest, areSecondaryActionsLocked } from "../../types/contest";
import { useOddsFormat } from "../../hooks/useOddsFormat";
import { computeTenDollarPurchasePreview } from "../../utils/secondaryPurchasePreview";
import { PredictionEntryModal } from "./PredictionEntryModal";
import { candidatesFromContestLineup, contestLineupDisplayName } from "../../lib/candidateUtils";
import { useCandidateSort } from "../../hooks/useCandidateSort";
import { participantLastName } from "../../lib/candidateSorting";

import { getLineupNumberLabel, resolveUserBorderColor } from "../../lib/lineupDisplay";
import { ReferralStakeIcon } from "./ReferralStakeIcon";

interface PredictionLineupsListProps {
  contest: Contest;
}

export const PredictionLineupsList: React.FC<PredictionLineupsListProps> = ({ contest }) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const { formatOdds } = useOddsFormat();
  const { sportId, status } = useEventScope();
  const { sort } = useCandidateSort(sportId);

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

  const sortedEntryRows = useMemo(() => {
    const rows = entryData.map((entry) => {
      const preview = computeTenDollarPurchasePreview({
        totalSupply: entry.totalSupply,
        entryLiquidity: entry.entryLiquidity,
        balance: entry.balance,
        totalSecondaryLiquidityBefore: secondaryTotalFunds,
        paymentDecimals,
        poolSnapshot,
      });
      const lineup = contest.contestLineups?.find((l) => l.entryId === entry.entryId);
      return { entry, preview, lineup };
    });

    return rows.sort((a, b) => {
      const aReturn = a.preview.projectedReturn;
      const bReturn = b.preview.projectedReturn;
      if (aReturn == null && bReturn == null) return 0;
      if (aReturn == null) return 1;
      if (bReturn == null) return -1;
      // Shorter odds (favorites) first — lower projected return on a fixed $10 buy.
      if (aReturn !== bReturn) return aReturn - bReturn;
      return (
        (a.lineup?.position ?? Number.MAX_SAFE_INTEGER) -
        (b.lineup?.position ?? Number.MAX_SAFE_INTEGER)
      );
    });
  }, [entryData, secondaryTotalFunds, paymentDecimals, poolSnapshot, contest.contestLineups]);

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
        {sortedEntryRows.map(({ entry, preview, lineup }) => {
          const userName = lineup?.user?.name || lineup?.user?.email || "Unknown";
          const lineupName = lineup ? contestLineupDisplayName(lineup) : "";
          const lineupNumberLabel = getLineupNumberLabel(lineupName);
          const oddsDisplay = preview.decimalOdds != null ? formatOdds(preview.decimalOdds) : "—";

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
              className={`rounded-none border-0 border-b border-l border-r border-t border-gray-200 bg-white p-3 font-display ${
                canOpenLineupModal
                  ? "cursor-pointer hover:shadow-md"
                  : "cursor-not-allowed opacity-60"
              } transition-all`}
              style={{
                borderLeftColor: resolvedLeftBorderColor,
                borderLeftWidth: "5px",
                borderLeftStyle: "solid",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold leading-tight text-gray-900 sm:text-lg">
                    {userName}
                    {lineupNumberLabel && (
                      <span className="ml-1 text-xs font-medium text-gray-500 sm:text-sm">
                        {lineupNumberLabel}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {(() => {
                      if (!lineup) return "No players";
                      const lineupCandidates = candidatesFromContestLineup(lineup);
                      const sortedPlayerNames = sort(lineupCandidates, "lineupPicks", status)
                        .map((candidate) => participantLastName(candidate))
                        .join(", ");

                      return sortedPlayerNames || lineupName || "No players";
                    })()}
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {lineup?.referralStake != null && lineup.referralStake.depth >= 1 ? (
                    <ReferralStakeIcon depth={lineup.referralStake.depth} />
                  ) : null}
                  <div className="text-right">
                    <div className="mb-0.5 text-lg font-bold tabular-nums leading-none text-emerald-600">
                      {oddsDisplay}
                    </div>
                    <div className="text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
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
