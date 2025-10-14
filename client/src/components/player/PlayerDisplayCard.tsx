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
      className="bg-white overflow-hidden border border-gray-200 rounded-lg"
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
      <div className="px-4 py-3 border-b border-gray-200">
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
      </div>

      {/* Bottom Row */}
      {currentRound ? (
        <div className="p-1 bg-gray-50">
          <div className="flex items-center justify-between gap-x-4 px-3">
            {/* TEAM button */}
            <div className="flex items-center text-sm text-gray-500 text-left whitespace-nowrap">
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 mr-1 ${
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
              <Label>CARD</Label>
            </div>

            {/* Round Points */}
            <div className="flex items-center flex-1 justify-evenly">
              {["r1", "r2", "r3", "r4"].map((roundKey, index) => {
                const roundData =
                  player.tournamentData[roundKey as keyof typeof player.tournamentData];
                const hasData = roundData && typeof roundData === "object" && "total" in roundData;

                return (
                  <div
                    key={roundKey}
                    className="flex items-center text-sm whitespace-nowrap min-w-[3.5rem] justify-center"
                  >
                    <Label>R{index + 1}</Label>
                    <span className="font-bold text-gray-500 ml-1.5">
                      {hasData ? roundData.total || 0 : "–"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expanded Scorecard Section */}
          {expandedPlayerId === player.id && (
            <div className="mt-2  shadow-sm" onClick={(e) => e.stopPropagation()}>
              <PlayerScorecard player={player} roundDisplay={currentRound.round} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
