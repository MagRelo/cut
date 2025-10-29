import React, { useMemo, useState } from "react";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { type Contest } from "../../types/contest";
import { PredictionEntryModal } from "./PredictionEntryModal";

interface PredictionLineupsListProps {
  contest: Contest;
}

export const PredictionLineupsList: React.FC<PredictionLineupsListProps> = ({ contest }) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Get entry IDs from contest lineups
  const entryIds = useMemo(() => {
    return (
      contest.contestLineups
        ?.filter((lineup) => lineup.entryId)
        .map((lineup) => lineup.entryId as string) || []
    );
  }, [contest.contestLineups]);

  // Fetch prediction data for all entries
  const { entryData, canPredict, isLoading, totalSpectatorCollateralFormatted } =
    useContestPredictionData({
      contestAddress: contest.address,
      entryIds,
      enabled: true,
      chainId: contest.chainId,
    });

  // Calculate market stats
  const marketStats = useMemo(() => {
    const totalPot = parseFloat(totalSpectatorCollateralFormatted);
    const totalSupplySum = entryData.reduce(
      (sum, e) => sum + parseFloat(e.totalSupplyFormatted),
      0
    );

    return {
      totalPot,
      totalSupplySum,
    };
  }, [entryData, totalSpectatorCollateralFormatted]);

  // Calculate what a $10 position would win for each entry
  const calculateWinnings = (price: number, supply: number) => {
    if (price === 0) return 0;

    const positionAmount = 10;
    const feePercentage = 0.15; // 15% fee

    // Calculate net position amount after fees
    const netPositionAmount = positionAmount * (1 - feePercentage);

    // Net position amount buys you (netPositionAmount / price) tokens
    const tokensFromPosition = netPositionAmount / price;

    // After your purchase, the supply increases
    const newSupply = supply + tokensFromPosition;

    // After your position, the prize pool increases by your net position amount
    const newTotalPot = marketStats.totalPot + netPositionAmount;

    // If entry wins, your payout = (your tokens / new total tokens) * new total pot
    const payout = (tokensFromPosition / newSupply) * newTotalPot;

    return payout;
  };

  // Calculate each entry's share of the market
  const calculateMarketShare = (supply: number) => {
    if (marketStats.totalSupplySum === 0) return 0;
    return (supply / marketStats.totalSupplySum) * 100;
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
      {/* Total Pot Header */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-300 rounded-lg p-4 mt-2">
        <div className="text-center">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
            Winner Pool
          </div>
          <div className="text-2xl font-bold text-purple-700">
            ${marketStats.totalPot.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Lineups */}
      <div className="space-y-2 mt-2">
        {[...entryData]
          .sort((a, b) => parseFloat(b.priceFormatted) - parseFloat(a.priceFormatted))
          .map((entry) => {
            const lineup = contest.contestLineups?.find((l) => l.entryId === entry.entryId);
            const userName = lineup?.user?.name || "Unknown";
            const lineupName = lineup?.tournamentLineup?.name || "Lineup";
            const supply = parseFloat(entry.totalSupplyFormatted);
            const price = parseFloat(entry.priceFormatted);
            const marketShare = calculateMarketShare(supply);
            const potentialWinnings = calculateWinnings(price, supply);

            return (
              <div
                key={entry.entryId}
                onClick={() => setSelectedEntryId(entry.entryId)}
                className="bg-white border-gray-200 border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  {/* Left - User & Lineup Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{userName}</div>
                    <div className="text-xs text-gray-500 truncate">{lineupName}</div>
                  </div>

                  {/* Right - CTA & Winnings */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <button className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">
                      BUY SHARES
                    </button>
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">$10 wins</span>{" "}
                      <span className="font-bold text-green-600">
                        ~${potentialWinnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Market Share Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Support: {marketShare.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gray-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(marketShare, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Prediction Modal */}
      <PredictionEntryModal
        isOpen={!!selectedEntryId}
        onClose={() => setSelectedEntryId(null)}
        contest={contest}
        entryId={selectedEntryId}
        entryData={entryData}
      />
    </div>
  );
};
