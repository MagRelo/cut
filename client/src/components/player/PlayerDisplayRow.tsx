import React from "react";
import type { PlayerWithTournamentData } from "../../types/player";
import {
  formatRoundStrokesVsPar,
  getRoundDataForDisplay,
  getRoundHoleProgress,
  getRoundShortLabel,
} from "./playerRoundUtils";

interface PlayerDisplayRowProps {
  player: PlayerWithTournamentData;
  roundDisplay: string;
  onClick?: () => void;
  ownershipPercentage?: number;
  isOwnedByCurrentUser?: boolean;
}

export const PlayerDisplayRow: React.FC<PlayerDisplayRowProps> = ({
  player,
  roundDisplay,
  onClick,
  ownershipPercentage,
}) => {
  // Calculate total points
  const totalPoints = player.tournamentData?.total || 0;

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

  const roundData = getRoundDataForDisplay(player.tournamentData, roundDisplay);
  const roundShortLabel = getRoundShortLabel(roundDisplay);
  const holeProgress = getRoundHoleProgress(roundData);
  const roundVsPar = formatRoundStrokesVsPar(roundData);
  const scoreThruLabel = (() => {
    if (holeProgress == null) return "";
    if (holeProgress.played === 0) return "Not Started";
    const roundComplete = holeProgress.remaining === 0 && holeProgress.played > 0;
    if (roundComplete) {
      return roundVsPar != null ? `${roundShortLabel}: ${roundVsPar}` : `${roundShortLabel}: –`;
    }
    const thruPart = `thru ${holeProgress.played}`;
    if (roundVsPar == null) return thruPart;
    return `${roundVsPar} ${thruPart}`;
  })();

  const leaderboardTotalRaw = player.tournamentData?.leaderboardTotal;
  const leaderboardTotalDisplay = leaderboardTotalRaw || "E";

  const content = (
    <div className="flex items-center justify-between gap-3">
      {/* Leaderboard total (top) + position (bottom), beside photo */}
      <div className="flex w-4 shrink-0 flex-col items-center justify-center gap-1.5 text-center tabular-nums">
        <span className="text-xs font-semibold leading-none text-gray-800">
          {player.tournamentData?.leaderboardPosition || "–"}
        </span>
        <span
          className={`text-xs font-semibold leading-none ${
            leaderboardTotalRaw?.startsWith("-") ? "text-red-600" : "text-gray-900"
          }`}
        >
          {leaderboardTotalDisplay}
        </span>
      </div>

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

      {/* Player name + status; thru below */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-md font-semibold text-gray-900 truncate leading-tight">
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
        <div
          className="flex min-h-5 items-center text-xs  tabular-nums text-gray-700"
          title="This round vs par and holes completed"
        >
          {scoreThruLabel || "\u00A0"}
        </div>
      </div>

      {/* Middle - Ownership (optional) */}
      {ownershipPercentage !== undefined && (
        <div className="flex-shrink-0 text-center min-w-[3.25rem] rounded bg-slate-100 px-2 py-1">
          <div className="text-xs font-semibold text-slate-700 leading-none">
            {ownershipPercentage}%
          </div>
          <div className="text-[9px] uppercase text-slate-500 font-semibold tracking-wide leading-none mt-0.5">
            OWN
          </div>
        </div>
      )}

      {/* Right - Points */}
      <div className="flex-shrink-0 flex items-center gap-3">
        {/*scorecard icon svg */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2v6h6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6" />
        </svg>

        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 leading-none">{totalPoints}</div>
          <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
            PTS
          </div>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="font-display w-full p-3 mb-1 text-left cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return <div className="font-display w-full p-3 mb-1">{content}</div>;
};
