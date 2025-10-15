import React from "react";
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
  // <span className={`text-sm font-medium text-gray-700 pr-1 ${className}`}>{children}</span>
  <span
    className={`text-xs uppercase text-slate-600 font-medium tracking-wide leading-none ${className}`}
  >
    {children}
  </span>
);

export const PlayerDisplayCard: React.FC<PlayerCardsProps> = ({ player, roundDisplay }) => {
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
    <div className="bg-white overflow-hidden border border-slate-300 rounded-sm">
      <div className="p-4 pb-2">
        {/* Top Row */}
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
            {/* Player Name */}
            <div className="text-lg font-semibold text-gray-800 truncate leading-tight text-left">
              {player.pga_lastName && player.pga_firstName
                ? `${player.pga_lastName}, ${player.pga_firstName}`
                : player.pga_displayName || ""}
              {/* optionally add the round icon of the current round */}
              {currentRound?.round && currentRound.data.icon !== "" && (
                <span className="text-xl text-gray-600 font-bold ml-2">
                  {currentRound.data.icon}
                </span>
              )}
            </div>

            {/* Leaderboard Position and Total */}
            <div className="text-sm text-gray-700 font-bold flex items-center gap-2 mt-1">
              <span className="min-w-[34px] text-center">
                {player.tournamentData.leaderboardPosition || "–"}
              </span>
              <span className="text-slate-400 font-thin">|</span>
              <span
                className={`min-w-[24px] text-center
                  ${
                    player.tournamentData.leaderboardTotal?.startsWith("-")
                      ? "text-red-600 font-medium"
                      : ""
                  }`}
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

        {/* Bottom Row */}
        <div className="mt-3 border-t border-slate-300">
          <div className="flex items-center justify-between gap-x-2 pt-2">
            {/* Round Scores and Bonuses */}
            <div className="flex items-center flex-1 justify-around gap-x-3">
              {/* R1 */}
              <div className="text-center">
                <div className="font-bold text-base text-gray-700">
                  {player.tournamentData.r1?.total !== undefined
                    ? player.tournamentData.r1.total
                    : "–"}
                </div>
                <Label>R1</Label>
              </div>

              {/* R2 */}
              <div className="text-center">
                <div className="font-bold text-base text-gray-700">
                  {player.tournamentData.r2?.total !== undefined
                    ? player.tournamentData.r2.total
                    : "–"}
                </div>
                <Label>R2</Label>
              </div>

              {/* Cut Bonus */}
              <div className="text-center">
                <div className="font-bold text-base text-gray-700">
                  {player.tournamentData.cut !== undefined ? player.tournamentData.cut : "–"}
                </div>
                <Label>CUT</Label>
              </div>

              {/* R3 */}
              <div className="text-center">
                <div className="font-bold text-base text-gray-700">
                  {player.tournamentData.r3?.total !== undefined
                    ? player.tournamentData.r3.total
                    : "–"}
                </div>
                <Label>R3</Label>
              </div>

              {/* R4 */}
              <div className="text-center">
                <div className="font-bold text-base text-gray-700">
                  {player.tournamentData.r4?.total !== undefined
                    ? player.tournamentData.r4.total
                    : "–"}
                </div>
                <Label>R4</Label>
              </div>

              {/* Position Bonus */}
              <div className="text-center">
                <div
                  className={`font-bold text-base ${
                    (player.tournamentData.bonus || 0) > 0 ? "text-green-600" : "text-gray-700"
                  }`}
                >
                  {player.tournamentData.bonus !== undefined ? player.tournamentData.bonus : "–"}
                </div>
                <Label>POS</Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scorecard Section */}
      <div>
        <PlayerScorecard player={player} roundDisplay={currentRound?.round || "R1"} />
      </div>
    </div>
  );
};
