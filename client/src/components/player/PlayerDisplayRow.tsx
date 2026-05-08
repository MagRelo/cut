import { ArrowTopRightOnSquareIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import React from "react";
import type { PlayerWithTournamentData } from "../../types/player";
import { useCurrentTournament } from "../../hooks/useTournamentData";
import {
  formatRoundStrokesVsPar,
  getRoundDataForDisplay,
  getRoundHoleProgress,
} from "./playerRoundUtils";

interface PlayerDisplayRowProps {
  player: PlayerWithTournamentData;
  roundDisplay: string;
  onClick?: () => void;
  ownershipPercentage?: number;
  isOwnedByCurrentUser?: boolean;
  /** Icon beside PTS: scorecard (default) or share action. */
  rowTrailing?: "scorecard" | "share";
  /** Required when `rowTrailing` is `"share"`. */
  onShare?: () => void;
}

export const PlayerDisplayRow: React.FC<PlayerDisplayRowProps> = ({
  player,
  roundDisplay,
  onClick,
  ownershipPercentage,
  rowTrailing = "scorecard",
  onShare,
}) => {
  const { tournament: currentTournament } = useCurrentTournament();
  const isTournamentEditable =
    currentTournament?.status !== "IN_PROGRESS" && currentTournament?.status !== "COMPLETED";
  const resolvedIsActive = !isTournamentEditable;

  const totalPoints = player.tournamentData?.total || 0;
  const leaderboardTotalRaw = player.tournamentData?.leaderboardTotal;
  const leaderboardTotalDisplay = leaderboardTotalRaw || "E";

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

  // Calculate score thru label
  const roundData = getRoundDataForDisplay(player.tournamentData, roundDisplay);
  const holeProgress = getRoundHoleProgress(roundData);
  const roundVsPar = formatRoundStrokesVsPar(roundData);
  const scoreThruLabel = (() => {
    if (holeProgress == null) return "";
    if (holeProgress.played === 0) return "Not started";
    const roundComplete = holeProgress.remaining === 0 && holeProgress.played > 0;
    if (roundComplete) {
      return roundVsPar != null ? `${roundVsPar}, Round Complete` : "–, Round Complete";
    }
    const thruPart = `thru ${holeProgress.played}`;
    if (roundVsPar == null) return thruPart;
    return `${roundVsPar} ${thruPart}`;
  })();

  const trailingControl =
    rowTrailing === "share" && onShare ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onShare();
        }}
        className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800"
        aria-label="Share player leaderboard link"
        title="Share player"
      >
        <ArrowTopRightOnSquareIcon className="h-5 w-5" aria-hidden />
      </button>
    ) : null;

  const inactiveContent = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {player.pga_imageUrl && (
          <div className="flex-shrink-0">
            <img
              className="h-10 w-10 rounded-full object-cover"
              src={player.pga_imageUrl}
              alt={player.pga_displayName || ""}
            />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-md font-semibold leading-tight text-gray-900">
            {player.pga_lastName && player.pga_firstName
              ? `${player.pga_lastName}, ${player.pga_firstName}`
              : player.pga_displayName || ""}
          </div>
          <div className="truncate text-xs text-gray-600">{player.pga_country?.trim() || "—"}</div>
        </div>
      </div>
      {trailingControl}
    </div>
  );

  const content = (
    <div className="flex items-center justify-between gap-3">
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
          {scoreThruLabel ? <span>{scoreThruLabel}</span> : "\u00A0"}
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
      <div className="flex-shrink-0 flex items-center gap-4">
        {rowTrailing === "share" && onShare ? (
          trailingControl
        ) : (
          <DocumentTextIcon className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />
        )}

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
        className="group font-display w-full text-left cursor-pointer"
      >
        {resolvedIsActive ? content : inactiveContent}
      </button>
    );
  }

  return <div className="font-display w-full">{resolvedIsActive ? content : inactiveContent}</div>;
};
