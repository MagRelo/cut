import React, { useState } from "react";
import type { PlayerWithTournamentData, TournamentPlayerData } from "../../types/player";
import { PlayerScorecard } from "./PlayerScorecard";

interface PlayerCardsProps {
  player: PlayerWithTournamentData;
  roundDisplay: string;
}

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

const Label: React.FC<LabelProps> = ({ children, className = "" }) => (
  <span className={`text-sm font-medium text-gray-400 pr-1 ${className}`}>{children}</span>
);

export const PlayerDisplayCard: React.FC<PlayerCardsProps> = ({ player, roundDisplay }) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const getCurrentRound = (player: PlayerWithTournamentData) => {
    if (!player?.tournamentData) return null;

    const roundNumber = roundDisplay.replace("R", "");
    const roundData = player.tournamentData[`r${roundNumber}` as keyof TournamentPlayerData];

    if (
      roundData &&
      typeof roundData === "object" &&
      "total" in roundData &&
      roundData.total !== undefined
    ) {
      return { round: `R${roundNumber}`, data: roundData };
    }
    return null;
  };

  const currentRound = getCurrentRound(player);

  return (
    <div
      onClick={() => setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)}
      className="bg-white overflow-hidden border border-gray-200 rounded-sm"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id);
        }
      }}
      aria-label={expandedPlayerId === player.id ? "Hide scorecard" : "Show scorecard"}
    >
      {/* Top Row */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center space-x-4">
          {/* Player Image */}
          {player.pga_imageUrl && (
            <div className="flex-shrink-0">
              <img
                className="h-14 w-14 rounded-full object-cover ring-2 ring-white"
                src={player.pga_imageUrl}
                alt={player.pga_displayName || ""}
              />
            </div>
          )}

          {/* Player Name and Position/Score stacked */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-gray-800 truncate leading-tight text-left">
              {player.pga_displayName || ""}
              {/* optionally add the round icon of the current round */}
              {currentRound?.round && currentRound.data.icon !== "" && (
                <span className="text-xl text-gray-600 font-bold ml-2">
                  {currentRound.data.icon}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-700 font-bold flex items-center gap-1 mt-1">
              <span className="min-w-[20px]">
                {player.tournamentData.leaderboardPosition || "–"}
              </span>
              <span className="text-gray-300">|</span>
              <span
                className={
                  player.tournamentData.leaderboardTotal?.startsWith("-")
                    ? "text-red-600 font-medium"
                    : ""
                }
              >
                {player.tournamentData.leaderboardTotal || "E"}
              </span>
            </div>
          </div>

          {/* Points */}
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-bold text-gray-900 leading-none">
              {(player.tournamentData.total || 0) +
                (player.tournamentData.cut || 0) +
                (player.tournamentData.bonus || 0)}
            </div>
            <div className="text-xs uppercase text-gray-500 font-semibold tracking-wide leading-none mt-1">
              PTS
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-x-4">
            {/* Scorecard button */}
            <div className="flex items-center text-sm text-gray-500 text-left whitespace-nowrap">
              {/* Scorecard icon */}
              <svg
                className="w-4 h-4 text-gray-400 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>

              <Label>SCORECARD</Label>
              {/* Expand/collapse chevron */}
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  expandedPlayerId === player.id ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            {/* Cut Bonus and Position Bonus */}
            <div className="flex items-center flex-1 justify-end gap-x-4">
              {/* Cut Bonus */}
              <div className="flex items-center gap-1 text-sm">
                <Label>CUT</Label>
                <span
                  className={`font-bold w-6 text-left ${
                    (player.tournamentData.cut || 0) > 0 ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {(player.tournamentData.cut || 0) > 0 ? `+${player.tournamentData.cut}` : ""}
                </span>
              </div>

              {/* Position Bonus */}
              <div className="flex items-center gap-1 text-sm">
                <Label>POS</Label>
                <span
                  className={`font-bold w-6 text-left ${
                    (player.tournamentData.bonus || 0) > 0 ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {(player.tournamentData.bonus || 0) > 0 ? `+${player.tournamentData.bonus}` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Expanded Scorecard Section */}
          {expandedPlayerId === player.id && (
            <div
              className="mt-2 border border-gray-300 rounded-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <PlayerScorecard player={player} roundDisplay={currentRound?.round || "R1"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
