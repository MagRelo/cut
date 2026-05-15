import React from "react";
import type { PlayerWithTournamentData } from "../../types/player";
import { PlayerDisplayRow } from "./PlayerDisplayRow";
import { useActiveTournamentRound } from "../../hooks/useTournamentData";
import { isScorecardRoundSelectable, roundHasBeenPlayed } from "./playerRoundUtils";

interface PlayerCardsProps {
  player: PlayerWithTournamentData;
  selectedScorecardRound: number;
  onScorecardRoundChange: (round: number) => void;
  playerRowTrailing?: "scorecard" | "share";
  onPlayerShare?: () => void;
}

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

const Label: React.FC<LabelProps> = ({ children, className = "" }) => (
  <span
    className={`text-[10px] uppercase text-gray-500 font-semibold font-display tracking-wide leading-none ${className}`}
  >
    {children}
  </span>
);

/** Label strip on top, value below — numerals match PlayerDisplayRow PTS (text-lg bold). */
const STAT_VALUE_CLASS =
  "flex min-h-[1.5rem] items-center justify-center font-display text-lg leading-none";
const STAT_CELL_OUTER =
  "flex h-full min-h-0 w-full min-w-0 flex-col px-1 py-1.5";
const STAT_LABEL_STRIP_BASE = "mb-0 w-full pt-0.5 pb-0.5 text-center";

export const PlayerDisplayCard: React.FC<PlayerCardsProps> = ({
  player,
  selectedScorecardRound,
  onScorecardRoundChange,
  playerRowTrailing = "scorecard",
  onPlayerShare,
}) => {
  const { roundNumber: currentRound } = useActiveTournamentRound();

  return (
    <div className="bg-white overflow-hidden">
      <div className="">
        <div className="p-3 py-4">
          <PlayerDisplayRow
            player={player}
            roundDisplay={`r${selectedScorecardRound}`}
            rowTrailing={playerRowTrailing}
            onShare={playerRowTrailing === "share" ? onPlayerShare : undefined}
          />
        </div>

        {/* Bottom Row: R1–R4, CUT, POS — top + vertical dividers + bottom border per cell (selected round has no bottom, meets scorecard) */}
        <div
          className="grid w-full grid-cols-[repeat(4,minmax(0,1fr))_repeat(2,minmax(0,1fr))] items-stretch border-t border-gray-200 divide-x divide-gray-200 bg-white"
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
            const selectable = isScorecardRoundSelectable(roundNum, data, currentRound);
            const selected = selectedScorecardRound === roundNum;
            const label = `R${roundNum}`;
            const value = played && data?.total !== undefined ? data.total : null;

            const valueClass = !played
              ? "font-medium text-gray-300"
              : "font-bold text-gray-900";

            if (!selectable) {
              return (
                <div
                  key={label}
                  className={`${STAT_CELL_OUTER} cursor-default !bg-white text-center`}
                  aria-label={`${label}, no round data`}
                >
                  <div className={STAT_LABEL_STRIP_BASE}>
                    <Label className="block !text-gray-400">{label}</Label>
                  </div>
                  <div className={`${STAT_VALUE_CLASS} ${valueClass}`}>{value ?? ""}</div>
                </div>
              );
            }

            return (
              <button
                key={label}
                type="button"
                onClick={() => onScorecardRoundChange(roundNum)}
                className={`group ${STAT_CELL_OUTER} text-center transition-colors focus:outline-none ${
                  selected ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className={STAT_LABEL_STRIP_BASE}>
                  <Label className={`block ${selected ? "" : played ? "!text-blue-600" : "!text-gray-500"}`}>
                    {label}
                  </Label>
                </div>
                <div className={`${STAT_VALUE_CLASS} ${valueClass}`}>{value ?? ""}</div>
              </button>
            );
          })}

          <div className={`${STAT_CELL_OUTER} !bg-white text-center`}>
            <div className={STAT_LABEL_STRIP_BASE}>
              <Label className="block !text-gray-400">CUT</Label>
            </div>
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
          </div>

          <div className={`${STAT_CELL_OUTER} !bg-white text-center`}>
            <div className={STAT_LABEL_STRIP_BASE}>
              <Label className="block !text-gray-400">POS</Label>
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};
