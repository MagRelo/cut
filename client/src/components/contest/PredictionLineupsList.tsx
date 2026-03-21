import React, { useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { simulateAddSecondaryPosition } from "@cut/secondary-pricing";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { type Contest, areSecondaryActionsLocked } from "../../types/contest";
import { ContestEntryModal } from "./ContestEntryModal";

const DEFAULT_USER_COLOR = "#9CA3AF"; // Tailwind gray-400 hex

const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

interface PredictionLineupsListProps {
  contest: Contest;
}

export const PredictionLineupsList: React.FC<PredictionLineupsListProps> = ({ contest }) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

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
    canWithdraw,
    isLoading,
    secondaryPrizePoolFormatted,
    secondaryTotalFundsFormatted,
    poolSnapshot,
  } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds,
    enabled: true,
    chainId: contest.chainId,
  });

  const selectedLineup = useMemo(() => {
    if (!selectedEntryId) return null;
    return contest.contestLineups?.find((l) => l.entryId === selectedEntryId) ?? null;
  }, [selectedEntryId, contest.contestLineups]);

  const selectedUserName = selectedLineup?.user?.name || selectedLineup?.user?.email;

  const tenTokenAmount = useMemo(() => parseUnits("10", 18), []);

  // Expected payout if this entry wins after a fixed $10 buy (matches ContestCatalyst secondary math).
  const calculateWinnings = (entry: (typeof entryData)[number]) => {
    if (!poolSnapshot) return 0;
    const sim = simulateAddSecondaryPosition({
      amount: tenTokenAmount,
      entryShares: entry.totalSupply,
      ...poolSnapshot,
    });
    if (sim.tokensToMint === 0n) return 0;
    const newSupply = entry.totalSupply + sim.tokensToMint;
    if (newSupply === 0n) return 0;
    const payoutWei = (sim.tokensToMint * sim.newSecondaryTotalFunds) / newSupply;
    return Number(formatUnits(payoutWei, 18));
  };

  if (!canPredict) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-yellow-800 text-sm font-display">
          Predictions are not available for this contest at this time.
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-700 mb-1 font-display">Winner Pool</h4>
      </div>

      {/* Info Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-sm p-3 mb-3">
        <ul className="space-y-1 text-xs text-gray-600">
          <li>• Buy shares in any team</li>
          <li>• Each share represents $1 of winnings if the team wins</li>
        </ul>
      </div>

      {/* Lineups */}
      <div className="space-y-2 mt-2">
        {[...entryData]
          .sort((a, b) => parseFloat(b.priceFormatted) - parseFloat(a.priceFormatted))
          .map((entry) => {
            const lineup = contest.contestLineups?.find((l) => l.entryId === entry.entryId);
            const userName = lineup?.user?.name || "Unknown";
            const potentialWinnings = calculateWinnings(entry);
            const costToBuyOneDollarOfWinnings =
              potentialWinnings > 0 && Number.isFinite(potentialWinnings)
                ? 10 / potentialWinnings
                : 0;

            const userSettings = lineup?.user?.settings;
            const maybeColor =
              typeof userSettings === "object" && userSettings !== null
                ? (userSettings as { color?: unknown }).color
                : undefined;
            const resolvedLeftBorderColor = isValidHexColor(maybeColor)
              ? maybeColor
              : DEFAULT_USER_COLOR;

            const positionNum = lineup?.position ?? 0;
            const positionOrdinalSuffix = getOrdinalSuffix(positionNum || 1);

            return (
              <div
                key={entry.entryId}
                onClick={() => !secondaryActionsLocked && setSelectedEntryId(entry.entryId)}
                className={`bg-white rounded-none border-0 border-l border-t border-r border-b border-gray-200 p-3 ${
                  secondaryActionsLocked
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:shadow-md"
                } transition-all`}
                style={{
                  borderLeftColor: resolvedLeftBorderColor,
                  borderLeftWidth: "3px",
                  borderLeftStyle: "solid",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left - User & Lineup Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{userName}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {(() => {
                        const lineupPlayers = lineup?.tournamentLineup?.players ?? [];
                        const sortedPlayerNames = [...lineupPlayers]
                          .sort((a, b) => {
                            const aTotal = a.tournamentData?.total || 0;
                            const bTotal = b.tournamentData?.total || 0;
                            return bTotal - aTotal;
                          })
                          .map((player) => player.pga_lastName)
                          .filter(Boolean)
                          .join(", ");

                        return sortedPlayerNames || "No players";
                      })()}
                    </div>
                  </div>

                  {/* Middle - Rank (over/under: position / line / pts) */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[3rem]">
                    <div className="text-sm font-bold text-gray-900 leading-tight tabular-nums">
                      {positionNum > 0 ? (
                        <>
                          {positionNum}
                          <sup className="text-[9px] font-bold">{positionOrdinalSuffix}</sup>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="w-full border-t border-gray-300 my-1" aria-hidden />
                    <div className="text-sm font-semibold text-gray-600 leading-tight tabular-nums">
                      {lineup?.score ?? 0} pts
                    </div>
                  </div>

                  {/* Right - CTA & Winnings */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 leading-none">
                        ${costToBuyOneDollarOfWinnings.toFixed(2)}
                      </div>
                      <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                        BUY
                      </div>
                    </div>
                  </div>
                </div>

                {/* Market Share Progress Bar */}
                {/* <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Support: {marketShare.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gray-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(marketShare, 100)}%` }}
                    />
                  </div>
                </div> */}
              </div>
            );
          })}
      </div>

      {/* Contest Entry Modal (Buy Shares tab selected by default) */}
      <ContestEntryModal
        isOpen={!!selectedEntryId}
        onClose={() => setSelectedEntryId(null)}
        contest={contest}
        lineup={selectedLineup}
        roundDisplay={contest.tournament?.roundDisplay ?? ""}
        userName={selectedUserName}
        entryData={entryData}
        secondaryPrizePoolFormatted={secondaryPrizePoolFormatted}
        secondaryTotalFundsFormatted={secondaryTotalFundsFormatted}
        poolSnapshot={poolSnapshot}
        canWithdraw={canWithdraw}
        initialTab="buyShares"
      />
    </div>
  );
};
