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

  // Calculate what a $10 bet would win for each entry
  const calculateWinnings = (price: number, supply: number) => {
    if (price === 0) return 0;

    const betAmount = 10;

    // $10 buys you (10 / price) tokens
    const tokensFromBet = betAmount / price;

    // After your purchase, the supply increases
    const newSupply = supply + tokensFromBet;

    // After your bet, the prize pool increases by your bet amount
    // (assuming no fees for now - adjust if there's a platform fee)
    const newTotalPot = marketStats.totalPot + betAmount;

    // If entry wins, your payout = (your tokens / new total tokens) * new total pot
    const payout = (tokensFromBet / newSupply) * newTotalPot;

    return payout;
  };

  // Calculate each entry's share of the market
  const calculateMarketShare = (supply: number) => {
    if (marketStats.totalSupplySum === 0) return 0;
    return (supply / marketStats.totalSupplySum) * 100;
  };

  const priceStats = useMemo(() => {
    const prices = entryData.map((e) => parseFloat(e.priceFormatted)).filter((p) => p > 0);
    if (prices.length === 0) return { min: 0, max: 0, avg: 0, totalEntries: 0 };

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    return { min, max, avg, totalEntries: prices.length };
  }, [entryData]);

  const getOddsIndicator = (price: number) => {
    if (priceStats.max === priceStats.min) {
      return {
        label: "Even Odds",
        emoji: "⚖️",
        color: "text-gray-700",
        bgColor: "bg-gray-100",
        barWidth: "50%",
      };
    }

    const range = priceStats.max - priceStats.min;
    const position = (price - priceStats.min) / range;

    if (position < 0.25) {
      return {
        label: "Long Shot",
        emoji: "🎲",
        color: "text-purple-700",
        bgColor: "bg-purple-100",
        barWidth: "25%",
      };
    }
    if (position < 0.5) {
      return {
        label: "Underdog",
        emoji: "🐕",
        color: "text-green-700",
        bgColor: "bg-green-100",
        barWidth: "40%",
      };
    }
    if (position < 0.75) {
      return {
        label: "Contender",
        emoji: "⚡",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        barWidth: "60%",
      };
    }
    return {
      label: "Favorite",
      emoji: "⭐",
      color: "text-orange-700",
      bgColor: "bg-orange-100",
      barWidth: "85%",
    };
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
    <>
      {/* Total Pot Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-3">
        <div className="text-center">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
            Prediction Prize Pool
          </div>
          <div className="text-2xl font-bold text-gray-900">${marketStats.totalPot.toFixed(2)}</div>
        </div>
      </div>

      {/* Lineups */}
      <div className="space-y-2">
        {entryData.map((entry) => {
          const lineup = contest.contestLineups?.find((l) => l.entryId === entry.entryId);
          const userName = lineup?.user?.name || "Unknown";
          const lineupName = lineup?.tournamentLineup?.name || "Lineup";
          const supply = parseFloat(entry.totalSupplyFormatted);
          const price = parseFloat(entry.priceFormatted);
          const marketShare = calculateMarketShare(supply);
          const potentialWinnings = calculateWinnings(price, supply);

          // Debug log
          // console.log("Entry debug:", {
          //   entryId: entry.entryId,
          //   supply,
          //   price,
          //   marketShare,
          //   potentialWinnings,
          //   totalPot: marketStats.totalPot,
          // });

          return (
            <div
              key={entry.entryId}
              onClick={() => setSelectedEntryId(entry.entryId)}
              className={`${
                entry.hasPosition ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
              } border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                {/* Left - User & Lineup Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{userName}</div>
                  <div className="text-xs text-gray-500 truncate">{lineupName}</div>
                </div>

                {/* Right - Market Share */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-medium text-gray-600">Market Share</div>
                  <div className="text-sm font-bold text-blue-600">{marketShare.toFixed(1)}%</div>
                </div>
              </div>

              {/* Winnings Scenario */}
              <div className="bg-gray-50 rounded px-2 py-1.5 text-xs text-gray-700">
                <span className="font-medium">$10 bet wins you</span>{" "}
                <span className="font-bold text-green-600">~${potentialWinnings.toFixed(2)}</span>
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
        priceStats={priceStats}
        getOddsIndicator={getOddsIndicator}
      />
    </>
  );
};
