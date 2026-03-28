import React from "react";
import type { PlayerWithTournamentData, TournamentPlayerData } from "../../types/player";
import { roundHasBeenPlayed } from "./playerRoundUtils";

interface PlayerCardsProps {
  player: PlayerWithTournamentData;
  selectedScorecardRound: number;
  onScorecardRoundChange: (round: number) => void;
}

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

const Label: React.FC<LabelProps> = ({ children, className = "" }) => (
  <span
    className={`text-[10px] uppercase text-gray-400 font-medium font-display tracking-wide leading-none ${className}`}
  >
    {children}
  </span>
);

/** Shared layout: value (font-display) + label strip with optional bottom rule — keeps row aligned. */
const STAT_VALUE_CLASS =
  "flex min-h-[1.5rem] items-center justify-center font-display text-lg leading-none tabular-nums";
const STAT_CELL_OUTER = "flex w-full min-w-0 flex-col px-1 pb-px";
const STAT_LABEL_STRIP_BASE =
  "mt-0.5 w-full border-b-2 pt-0.5 pb-1 text-center transition-[border-color] duration-150";

export const PlayerDisplayCard: React.FC<PlayerCardsProps> = ({
  player,
  selectedScorecardRound,
  onScorecardRoundChange,
}) => {
  const getCurrentRound = (player: PlayerWithTournamentData) => {
    if (!player?.tournamentData) return null;

    const roundNumber = String(selectedScorecardRound);
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
    <div className="bg-white overflow-hidden">
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

          {/* Player Name + country */}
          <div className="flex min-w-0 flex-1 flex-col justify-center text-left">
            <div className="truncate font-display text-2xl font-semibold leading-tight text-gray-800">
              {player.pga_lastName && player.pga_firstName
                ? `${player.pga_lastName}, ${player.pga_firstName}`
                : player.pga_displayName || ""}
              {currentRound?.round && currentRound.data.icon !== "" && (
                <span className="ml-2 text-2xl font-bold text-gray-600">
                  {currentRound.data.icon}
                </span>
              )}
            </div>
            {player.pga_country?.trim() ? (
              <div className="mt-0.5 truncate text-sm font-normal text-gray-500">
                {player.pga_country.trim()}
              </div>
            ) : null}
          </div>

          {/* Points */}
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-display font-bold tabular-nums text-gray-900 leading-none">
              {player.tournamentData.total || 0}
            </div>
            <Label className="mt-1 block leading-none">PTS</Label>
          </div>
        </div>

        {/* Bottom Row: R1–R4, CUT, POS */}
        <div className="">
          <div
            className="grid w-full grid-cols-[repeat(4,minmax(0,1fr))_repeat(2,minmax(0,1fr))] items-start gap-x-1 pt-3 pb-0.5"
            role="presentation"
          >
            {(
              [
                [1, player.tournamentData.r1],
                [2, player.tournamentData.r2],
                [3, player.tournamentData.r3],
                [4, player.tournamentData.r4],
              ] as const
            ).map(([roundNum, data]) => {
              const played = roundHasBeenPlayed(data);
              const selected = selectedScorecardRound === roundNum;
              const label = `R${roundNum}`;
              const value = played && data?.total !== undefined ? data.total : null;

              const valueClass = played ? "font-bold text-gray-900" : "font-medium text-gray-300";

              if (!played) {
                return (
                  <div
                    key={label}
                    className={`${STAT_CELL_OUTER} cursor-default text-center`}
                    aria-label={`${label}, no round data`}
                  >
                    <div className={`${STAT_VALUE_CLASS} ${valueClass}`}>{value ?? ""}</div>
                    <div className={`${STAT_LABEL_STRIP_BASE} border-transparent`}>
                      <Label className="block">{label}</Label>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onScorecardRoundChange(roundNum)}
                  className={`group ${STAT_CELL_OUTER} text-center focus:outline-none`}
                >
                  <div className={`${STAT_VALUE_CLASS} ${valueClass}`}>{value ?? ""}</div>
                  <div
                    className={`${STAT_LABEL_STRIP_BASE} ${
                      selected ? "border-blue-500" : "border-gray-200 group-hover:border-gray-400"
                    }`}
                  >
                    <Label className={`block ${selected ? "!text-blue-500" : ""}`}>{label}</Label>
                  </div>
                </button>
              );
            })}

            <div className={`${STAT_CELL_OUTER} text-center`}>
              <div
                className={`${STAT_VALUE_CLASS} ${
                  player.tournamentData.cut && player.tournamentData.cut > 0
                    ? "font-bold text-green-600"
                    : "font-medium text-gray-300"
                }`}
              >
                {player.tournamentData.cut && player.tournamentData.cut > 0
                  ? `+${player.tournamentData.cut}`
                  : ""}
              </div>
              <div className={`${STAT_LABEL_STRIP_BASE} border-transparent`}>
                <Label className="block">CUT</Label>
              </div>
            </div>

            <div className={`${STAT_CELL_OUTER} text-center`}>
              <div
                className={`${STAT_VALUE_CLASS} ${
                  player.tournamentData.bonus && player.tournamentData.bonus > 0
                    ? "font-bold text-green-600"
                    : "font-medium text-gray-300"
                }`}
              >
                {player.tournamentData.bonus && player.tournamentData.bonus > 0
                  ? `+${player.tournamentData.bonus}`
                  : ""}
              </div>
              <div className={`${STAT_LABEL_STRIP_BASE} border-transparent`}>
                <Label className="block">POS</Label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
