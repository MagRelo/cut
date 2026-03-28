import React from "react";
import type { PlayerWithTournamentData, RoundData, TournamentPlayerData } from "../../types/player";

/** Top three rows (holes, par, score): unified muted band */
const BAND_BG = "bg-slate-100";
const BLINE = "border-t border-b border-slate-200";
const CELL = `px-2 py-2.5 text-center text-xs tabular-nums ${BLINE}`;
/** Sticky first-column row labels (matches Par row) */
const ROW_LABEL = `sticky left-0 z-10 border-r border-slate-200 px-3 py-2.5 text-left align-top min-w-[3.5rem] w-[3.5rem] text-xs font-display font-semibold uppercase tracking-wide text-slate-500 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)] ${BLINE}`;

/**
 * Five visual treatments in `ScoreDisplay` (score vs hole par).
 * `par` is plain text; chip states set shape, border, and optional fill independently.
 */
const SCORE_DISPLAY_STATE = {
  par: null,
  /** Two or more under par (eagle, albatross, …) */
  eagleOrBetter: {
    shape: "rounded-full",
    borderWidth: "border-2",
    borderColor: "border-emerald-500",
    background: "bg-emerald-400/10",
  },
  birdie: {
    shape: "rounded-full",
    borderWidth: "border-2",
    borderColor: "border-emerald-500",
    background: "",
  },
  bogey: {
    shape: "",
    borderWidth: "border-2",
    borderColor: "border-red-400",
    background: "",
  },
  /** Two or more over par */
  doubleBogeyOrWorse: {
    shape: "",
    borderWidth: "border-2",
    borderColor: "border-red-400",
    background: "bg-red-400/10",
  },
} as const;

type ScoreDisplayStateKey = keyof typeof SCORE_DISPLAY_STATE;

function scoreDisplayStateKey(scoreDiff: number): ScoreDisplayStateKey {
  if (scoreDiff === 0) return "par";
  if (scoreDiff < -1) return "eagleOrBetter";
  if (scoreDiff === -1) return "birdie";
  if (scoreDiff === 1) return "bogey";
  return "doubleBogeyOrWorse";
}

function scoreDisplayChipClass(
  chip: NonNullable<(typeof SCORE_DISPLAY_STATE)[Exclude<ScoreDisplayStateKey, "par">]>,
): string {
  return [
    "inline-flex h-7 w-7 items-center justify-center",
    chip.shape,
    chip.borderWidth,
    chip.borderColor,
    chip.background,
  ]
    .filter((part) => part.length > 0)
    .join(" ");
}

interface StablefordDisplayProps {
  points: number;
  cellClassName?: string;
  /** When true, render an empty cell for 0 (player scorecard points row only). */
  hideZero?: boolean;
}

export const StablefordDisplay: React.FC<StablefordDisplayProps> = ({
  points,
  cellClassName = "",
  hideZero = false,
}) => {
  if (hideZero && points === 0) {
    return <td className={`${CELL} min-w-[2.25rem] w-[2.25rem] ${cellClassName}`.trim()} />;
  }

  let pointsClass = "text-slate-700";
  if (points > 0) pointsClass = "font-semibold text-emerald-600/90";
  else if (points < 0) pointsClass = "font-semibold text-red-500/90";

  const displayValue = points > 0 ? `+${points}` : points.toString();

  return (
    <td className={`${CELL} ${pointsClass} min-w-[2.25rem] w-[2.25rem] ${cellClassName}`.trim()}>
      {displayValue}
    </td>
  );
};

interface ScoreDisplayProps {
  score: number;
  par: number;
  cellClassName?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, par, cellClassName = "" }) => {
  const scoreDiff = score - par;
  const numClass = "text-xs font-medium tabular-nums text-slate-500";
  const stateKey = scoreDisplayStateKey(scoreDiff);
  const state = SCORE_DISPLAY_STATE[stateKey];

  const content: React.ReactNode =
    state === null ? (
      <span className={numClass}>{score}</span>
    ) : (
      <span className={`${scoreDisplayChipClass(state)} ${numClass}`}>{score}</span>
    );

  return (
    <td className={`${CELL} text-slate-500 min-w-[2.25rem] w-[2.25rem] ${cellClassName}`.trim()}>
      {content}
    </td>
  );
};

interface PlayerScorecardProps {
  player: PlayerWithTournamentData;
  selectedRound: number;
}

export const PlayerScorecard: React.FC<PlayerScorecardProps> = ({ player, selectedRound }) => {
  const getRoundData = (roundNumber: number) => {
    const roundKey = `r${roundNumber}` as keyof Pick<
      TournamentPlayerData,
      "r1" | "r2" | "r3" | "r4"
    >;
    return player.tournamentData[roundKey] as RoundData | undefined;
  };

  const roundData = getRoundData(selectedRound);
  const hasHoleData = roundData?.holes?.scores && roundData.holes.scores.length > 0;

  const renderHoleRow = () => (
    <tr className={BAND_BG}>
      <th className={`${ROW_LABEL} ${BAND_BG}`} scope="row">
        Hole
      </th>
      {Array.from({ length: 18 }, (_, i) => (
        <th
          key={i}
          className={`${BLINE} border-slate-200 ${BAND_BG} px-2 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-500 min-w-[2.25rem] w-[2.25rem]`}
        >
          {i + 1}
        </th>
      ))}
      <th
        className={`${BLINE} border-l border-slate-200 ${BAND_BG} px-3 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-600 min-w-[3.5rem] w-[3.5rem]`}
      >
        Total
      </th>
    </tr>
  );

  const renderParRow = () => {
    if (!roundData?.holes) return null;
    const pars = Array(18)
      .fill(null)
      .map((_, i) => roundData.holes?.par?.[i] ?? null);

    return (
      <tr className={`${BAND_BG} border-t border-slate-200/80`}>
        <th className={`${ROW_LABEL} ${BAND_BG}`} scope="row">
          Par
        </th>
        {pars.map((par: number | null, i: number) => (
          <td
            key={i}
            className={`${BLINE} ${BAND_BG} px-2 py-2 text-center text-xs font-medium tabular-nums text-slate-500 min-w-[2.25rem] w-[2.25rem]`}
          >
            {par === null ? "–" : par}
          </td>
        ))}
        <td
          className={`${BLINE} border-l border-slate-200 ${BAND_BG} px-3 py-2 text-center text-xs font-medium tabular-nums text-slate-600 min-w-[3.5rem] w-[3.5rem]`}
        >
          {pars.some((par) => par !== null)
            ? pars.reduce((sum: number, par: number | null) => sum + (par || 0), 0)
            : "–"}
        </td>
      </tr>
    );
  };

  const renderScoreRow = () => {
    if (!roundData?.holes?.scores?.length) return null;

    const pars = Array(18)
      .fill(null)
      .map((_, i) => roundData.holes?.par?.[i] ?? null);

    const scoreTotal = roundData.holes.scores
      .filter((score: number | null): score is number => score !== null)
      .reduce((sum: number, score: number) => sum + score, 0);

    return (
      <tr className={`${BAND_BG} border-t border-slate-200/80`}>
        <th className={`${ROW_LABEL} ${BAND_BG}`} scope="row">
          Score
        </th>
        {roundData.holes.scores.map((score: number | null, i: number) => {
          const par = pars[i];
          if (score === null || par === null) {
            return (
              <td
                key={i}
                className={`${CELL} ${BAND_BG} text-slate-500 min-w-[2.25rem] w-[2.25rem]`}
              >
                –
              </td>
            );
          }
          return <ScoreDisplay key={i} score={score} par={par} cellClassName={BAND_BG} />;
        })}
        <td
          className={`${BLINE} border-l border-slate-200 ${BAND_BG} px-3 py-2 text-center text-xs font-medium tabular-nums text-slate-600 min-w-[3.5rem] w-[3.5rem]`}
        >
          {roundData.holes.scores.some((score: number | null) => score !== null) ? scoreTotal : "–"}
        </td>
      </tr>
    );
  };

  const renderPointsRow = () => {
    if (!roundData?.holes?.stableford?.length) return null;
    const pointsPad = "!py-3.5";
    return (
      <tr className="border-t border-slate-200 bg-white">
        <th className={`${ROW_LABEL} bg-white ${pointsPad}`} scope="row">
          Points
        </th>
        {roundData.holes.stableford.map((points: number | null, i: number) => {
          if (points === null) {
            return (
              <td key={i} className={`${CELL} bg-white min-w-[2.25rem] w-[2.25rem] ${pointsPad}`} />
            );
          }
          return (
            <StablefordDisplay
              key={i}
              points={points}
              hideZero
              cellClassName={`bg-white ${pointsPad}`}
            />
          );
        })}
        <td
          className={`${BLINE} border-l border-slate-200 bg-white px-3 py-3.5 text-center text-xs tabular-nums text-slate-900 min-w-[3.5rem] w-[3.5rem]`}
        >
          {(() => {
            const total = roundData.holes.stableford.reduce(
              (sum: number, p: number | null) => sum + (p === null ? 0 : p),
              0,
            );
            return total === 0 ? "" : total;
          })()}
        </td>
      </tr>
    );
  };

  const pointsRow = renderPointsRow();

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        {hasHoleData ? (
          <table className="min-w-full border-collapse">
            <thead>
              {renderHoleRow()}
              {renderParRow()}
              {renderScoreRow()}
            </thead>
            {pointsRow ? <tbody>{pointsRow}</tbody> : null}
          </table>
        ) : (
          <div className="px-6 py-10 text-center font-display text-sm text-slate-600">
            No scorecard data available for Round {selectedRound}
          </div>
        )}
      </div>
    </div>
  );
};
