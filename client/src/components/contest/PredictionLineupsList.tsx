import React, { useMemo, useState } from "react";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { type Contest, areSecondaryActionsLocked } from "../../types/contest";
import { ContestEntryModal } from "./ContestEntryModal";

const DEFAULT_USER_COLOR = "#9CA3AF"; // Tailwind gray-400 hex
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

  // Calculate market stats
  const marketStats = useMemo(() => {
    // Keep in sync with PredictionEntryForm:
    // - Form uses `secondaryTotalFundsFormatted` (prize pool + subsidy) whenever it's a finite number.
    // - Only falls back if it can't be parsed as a number.
    const parsedSecondaryTotalFunds = Number.parseFloat(secondaryTotalFundsFormatted);
    const parsedSecondaryPrizePool = Number.parseFloat(secondaryPrizePoolFormatted);

    const totalPot = Number.isFinite(parsedSecondaryTotalFunds)
      ? parsedSecondaryTotalFunds
      : Number.isFinite(parsedSecondaryPrizePool)
        ? parsedSecondaryPrizePool
        : entryData.reduce((sum, e) => {
            const supply = Number.parseFloat(e.totalSupplyFormatted ?? "0");
            return sum + (Number.isFinite(supply) ? supply : 0);
          }, 0);

    return { totalPot };
  }, [entryData, secondaryPrizePoolFormatted, secondaryTotalFundsFormatted]);

  // Calculate what a $10 position would win for each entry
  const calculateWinnings = (price: number, supply: number) => {
    const positionAmount = 10;
    const feePercentage = 0.15; // 15% fee

    // Calculate net position amount after fees
    const netPositionAmount = positionAmount * (1 - feePercentage);

    // After your position, the prize pool increases by your net position amount
    const newTotalPot = marketStats.totalPot + netPositionAmount;

    // Special case: If no one has bought shares yet (supply = 0 and price = 0)
    // You would own 100% of the tokens for this entry, so you'd win the entire pot
    if (supply === 0 || price === 0) {
      // If you're the only buyer and this entry wins, you get the entire new pot
      return newTotalPot;
    }

    // Net position amount buys you (netPositionAmount / price) tokens
    const tokensFromPosition = netPositionAmount / price;

    // After your purchase, the supply increases
    const newSupply = supply + tokensFromPosition;

    // If entry wins, your payout = (your tokens / new total tokens) * new total pot
    const payout = (tokensFromPosition / newSupply) * newTotalPot;

    return payout;
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
        <h4 className="text-lg font-semibold text-gray-700 mb-1 font-display">Winner Market</h4>
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
            const supply = parseFloat(entry.totalSupplyFormatted);
            const price = parseFloat(entry.priceFormatted);
            const potentialWinnings = calculateWinnings(price, supply);
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
        canWithdraw={canWithdraw}
        initialTab="buyShares"
      />
    </div>
  );
};
