import React from "react";
import type { PlayerWithTournamentData } from "../../types/player";

interface PlayerDisplayRowProps {
  player: PlayerWithTournamentData;
  roundDisplay: string;
  onClick?: () => void;
  ownershipPercentage?: number;
  showArrow?: boolean;
}

export const PlayerDisplayRow: React.FC<PlayerDisplayRowProps> = ({
  player,
  roundDisplay,
  onClick,
  ownershipPercentage,
  showArrow = true,
}) => {
  // Calculate total points
  const totalPoints =
    (player.tournamentData?.total || 0) +
    (player.tournamentData?.cut || 0) +
    (player.tournamentData?.bonus || 0);

  // Get hot/cold icon from current round
  const getCurrentRoundIcon = () => {
    const roundKey = roundDisplay?.toLowerCase() || "r1";
    const roundData = player.tournamentData?.[roundKey as keyof typeof player.tournamentData];
    if (roundData && typeof roundData === "object" && "icon" in roundData) {
      return roundData.icon || "";
    }
    return "";
  };

  const icon = getCurrentRoundIcon();

  const content = (
    <div className="flex items-center justify-between gap-3">
      {/* Profile Picture */}
      {player.pga_imageUrl && (
        <div className="flex-shrink-0">
          <img
            className="h-10 w-10 rounded-full object-cover"
            src={player.pga_imageUrl}
            alt={player.pga_displayName || ""}
          />
        </div>
      )}

      {/* Left - Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
            {player.pga_lastName && player.pga_firstName
              ? `${player.pga_lastName}, ${player.pga_firstName}`
              : player.pga_displayName || ""}
          </div>
          {icon && (
            <span className="text-base flex-shrink-0" title="Player status">
              {icon}
            </span>
          )}
        </div>

        {/* Leaderboard Position and Total */}
        <div className="text-xs text-gray-700 font-bold flex items-center gap-2 mt-0.5">
          <span className="min-w-[20px] text-center">
            {player.tournamentData?.leaderboardPosition || "–"}
          </span>
          <span className="text-gray-300 font-medium">|</span>
          <span
            className={`min-w-[20px] text-center
              ${
                player.tournamentData?.leaderboardTotal?.startsWith("-")
                  ? "text-red-600 font-medium"
                  : ""
              }`}
          >
            {player.tournamentData?.leaderboardTotal || "E"}
          </span>
        </div>
      </div>

      {/* Middle - Ownership (optional) */}
      {ownershipPercentage !== undefined && (
        <div className="flex-shrink-0 text-right min-w-[3rem]">
          <div className="text-sm font-bold text-gray-700 leading-none">{ownershipPercentage}%</div>
          <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
            OWN
          </div>
        </div>
      )}

      {/* Right - Points */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900 leading-none">{totalPoints}</div>
          <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
            PTS
          </div>
        </div>
        {showArrow && (
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full bg-white rounded-lg p-3 text-left cursor-pointer">
        {content}
      </button>
    );
  }

  return <div className="w-full bg-white rounded-lg p-3">{content}</div>;
};
