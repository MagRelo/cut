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
  const { entryData, canPredict, isLoading } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds,
    enabled: true,
  });

  // Calculate relative odds and betting indicators
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
      <div className="mt-1">
        {entryData.map((entry) => {
          const lineup = contest.contestLineups?.find((l) => l.entryId === entry.entryId);
          const userName = lineup?.user?.name || "Unknown";
          const lineupName = lineup?.tournamentLineup?.name || "Lineup";
          const price = parseFloat(entry.priceFormatted);
          const indicator = getOddsIndicator(price);

          // Normalize odds around 1.0 (cheap < 1, expensive > 1)
          // barWidth ranges from 25% (long shot) to 85% (favorite)
          // Convert to normalized odds: 25% → 0.5, 50% → 1.0, 85% → 1.7
          const normalizedOdds = parseFloat(indicator.barWidth) / 50;

          return (
            <div
              key={entry.entryId}
              onClick={() => setSelectedEntryId(entry.entryId)}
              className={`${
                entry.hasPosition ? "bg-blue-50" : "bg-white"
              } rounded-sm p-3 mb-1 cursor-pointer hover:bg-gray-50 transition-colors`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left - User & Lineup Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {userName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{lineupName}</div>
                  {/* {entry.hasPosition && (
                    <div className="text-xs text-blue-600 font-medium mt-0.5">✓ Active bet</div>
                  )} */}
                </div>

                {/* Right - Market Info */}
                <div className="text-right flex-shrink-0">
                  <div className={`text-xs font-semibold ${indicator.color}`}>
                    {normalizedOdds.toFixed(2)}x
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{indicator.barWidth} volume</div>
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
        priceStats={priceStats}
        getOddsIndicator={getOddsIndicator}
      />
    </>
  );
};
