import React from "react";
import type { PlayerWithTournamentData } from "../../types/player";

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

const Label: React.FC<LabelProps> = ({ children, className = "" }) => (
  <span className={`text-sm font-medium text-gray-400 pr-1 ${className}`}>{children}</span>
);

interface PlayerSelectionCardProps {
  player?: PlayerWithTournamentData;
  showImage?: boolean;
  className?: string;
}

export const PlayerSelectionCard: React.FC<PlayerSelectionCardProps> = ({
  player,
  showImage = true,
  className = "",
}) => {
  if (!player) {
    return (
      <div className={className}>
        {/* Top Row - Placeholder */}
        <div className="flex items-center space-x-4 mb-2">
          {showImage && (
            <div className="flex-shrink-0">
              <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center border border-gray-300">
                <svg
                  className="h-8 w-8 text-gray-300"
                  fill="none"
                  viewBox="0 0 23 23"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-gray-400 truncate text-left">
              No golfer selected
            </div>
            <div className="flex items-center space-x-4 mt-1">
              <div className="text-sm text-gray-400">
                <Label>FedEx</Label>
                <span className="font-bold text-gray-400 ml-1">-</span>
              </div>
              <div className="text-sm text-gray-400">
                <Label>OWGR</Label>
                <span className="font-bold text-gray-400 ml-1">-</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Stats */}
        <div className="flex items-center justify-around border-t border-gray-100 pt-2">
          <div className="text-sm text-gray-400">
            <Label>Events</Label>
            <span className="font-bold text-gray-400 ml-1">-</span>
          </div>
          <div className="text-sm text-gray-400">
            <Label>Wins</Label>
            <span className="font-bold text-gray-400 ml-1">-</span>
          </div>
          <div className="text-sm text-gray-400">
            <Label>T10</Label>
            <span className="font-bold text-gray-400 ml-1">-</span>
          </div>
          <div className="text-sm text-gray-400">
            <Label>Cuts</Label>
            <span className="font-bold text-gray-400 ml-1">-</span>
          </div>
        </div>
      </div>
    );
  }

  // Find the 2025 season performance data
  const currentSeason = player.pga_performance?.performance?.find((p) => p.season === "2025");
  const currentStandings = player.pga_performance?.standings;

  return (
    <div className={className}>
      {/* Top Row - Image and Name */}
      <div className="flex items-center space-x-4 mb-2">
        {showImage && player.pga_imageUrl && (
          <div className="flex-shrink-0">
            <img
              className="h-14 w-14 rounded-full object-cover"
              src={player.pga_imageUrl}
              alt={player.pga_displayName || ""}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold text-gray-600 truncate text-left">
            {player.pga_displayName || ""}
          </div>
          <div className="flex items-center space-x-4 mt-1">
            <div className="text-sm text-gray-500">
              <Label>FedEx</Label>
              <span className="font-bold text-gray-600 ml-1">{currentStandings?.rank}</span>
            </div>
            <div className="text-sm text-gray-500">
              <Label>OWGR</Label>
              <span className="font-bold text-gray-600 ml-1">{currentStandings?.owgr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Stats */}
      <div className="flex items-center justify-around border-t border-gray-100 pt-2">
        <div className="text-sm text-gray-500">
          <Label>Wins</Label>
          <span className="font-bold text-gray-600 ml-1">
            {currentSeason?.stats.find((s) => s.title === "Wins")?.value || "0"}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          <Label>T10</Label>
          <span className="font-bold text-gray-600 ml-1">
            {currentSeason?.stats.find((s) => s.title === "Top 10")?.value || "0"}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          <Label>T25</Label>
          <span className="font-bold text-gray-600 ml-1">
            {currentSeason?.stats.find((s) => s.title === "Top 25")?.value || "0"}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          <Label>Cuts</Label>
          <span className="font-bold text-gray-600 ml-1">
            {currentSeason?.stats.find((s) => s.title === "Cuts Made")?.value || "0"}
            <span className="text-gray-400">/</span>
            {currentSeason?.stats.find((s) => s.title === "Events")?.value || "0"}
          </span>
        </div>
      </div>
    </div>
  );
};
