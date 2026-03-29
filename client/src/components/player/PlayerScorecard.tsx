import React from "react";
import type { PlayerWithTournamentData, RoundData, TournamentPlayerData } from "../../types/player";

/* -------------------------------------------------------------------------- */
/* Table layout — band rows (hole / par / score) vs points row (white)        */
/* -------------------------------------------------------------------------- */

const band = "bg-slate-100";
const rowDivider = "border-t border-slate-200/80";
const cellY = "border-y border-slate-200";

const holeCol = "min-w-[2.25rem] w-[2.25rem]";
const totalCol = "min-w-[3.5rem] w-[3.5rem]";

/** Sticky first column; shadow separates from scrolling body */
const rowLabelBase =
  "sticky left-0 z-10 border-r border-slate-200 px-3 text-left align-middle text-xs font-display font-semibold uppercase tracking-wide text-slate-500 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]";

const rowLabelBand = `${rowLabelBase} ${cellY} ${band} py-2.5 ${totalCol}`;
/** Points row: taller cells than band (overrides scoreCell py-2.5) */
const pointsRowY = "!py-3.5";

const rowLabelPoints = `${rowLabelBase} ${cellY} bg-white ${pointsRowY} ${totalCol}`;

/** Default numeric cell in score row (par height) */
const scoreCell = `px-2 py-2.5 text-center text-xs tabular-nums ${cellY}`;

/** Hole number headers — slightly tighter vertical padding than score cells */
const holeHeader = `${cellY} ${band} px-2 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-500 ${holeCol}`;

/** Par row body cells — match hole number cells (`holeHeader`) */
const parCell = `${cellY} ${band} px-2 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-500 ${holeCol}`;

/** Total column in band (hole row, par row, score row) */
const bandTotal = `${cellY} border-l border-slate-200 ${band} px-3 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-600 ${totalCol}`;

/**
 * Score row inner slot: `min-height` on table cells is unreliable with border-collapse; reserve chip height (h-7) in a flex slot instead.
 */
const scoreRowSlot = "flex h-7 w-full shrink-0 items-center justify-center";

/** Points row numeric cells */
const pointsCell = `${scoreCell} bg-white ${holeCol} ${pointsRowY}`;
const pointsTotal = `${cellY} border-l border-slate-200 bg-white px-3 py-3.5 text-center text-xs tabular-nums text-slate-900 ${totalCol}`;

/* -------------------------------------------------------------------------- */
/* Score vs par — chip appearance (full strings, no runtime concat filter)      */
/* -------------------------------------------------------------------------- */

const scoreNum = "text-xs font-medium tabular-nums text-slate-600";

const scoreChip = {
  eagleOrBetter:
    "inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-400/10",
  birdie: "inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500",
  bogey: "inline-flex h-7 w-7 items-center justify-center border-2 border-red-400",
  doubleBogeyOrWorse:
    "inline-flex h-7 w-7 items-center justify-center border-2 border-red-400 bg-red-400/10",
} as const;

type ScoreKind = "par" | keyof typeof scoreChip;

function scoreKind(scoreDiff: number): ScoreKind {
  if (scoreDiff === 0) return "par";
  if (scoreDiff < -1) return "eagleOrBetter";
  if (scoreDiff === -1) return "birdie";
  if (scoreDiff === 1) return "bogey";
  return "doubleBogeyOrWorse";
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
    return <td className={`${pointsCell} ${cellClassName}`.trim()} />;
  }

  const tone =
    points > 0 ? "font-semibold text-emerald-600/90" : points < 0 ? "font-semibold text-red-500/90" : "text-slate-700";

  const displayValue = points > 0 ? `+${points}` : points.toString();

  return (
    <td className={`${pointsCell} ${tone} ${cellClassName}`.trim()}>
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
  const kind = scoreKind(score - par);

  const inner =
    kind === "par" ? (
      <span className={scoreNum}>{score}</span>
    ) : (
      <span className={`${scoreChip[kind]} ${scoreNum}`}>{score}</span>
    );

  return (
    <td className={`${scoreCell} text-slate-600 ${holeCol} align-middle ${cellClassName}`.trim()}>
      <div className={scoreRowSlot}>{inner}</div>
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

  const holeRow = (
    <tr className={band}>
      <th className={rowLabelBand} scope="row">
        Hole
      </th>
      {Array.from({ length: 18 }, (_, i) => (
        <th key={i} className={holeHeader}>
          {i + 1}
        </th>
      ))}
      <th className={bandTotal}>Total</th>
    </tr>
  );

  const parRow =
    roundData?.holes &&
    (() => {
      const pars = Array.from({ length: 18 }, (_, i) => roundData.holes?.par?.[i] ?? null);
      return (
        <tr className={`${band} ${rowDivider}`}>
          <th className={rowLabelBand} scope="row">
            Par
          </th>
          {pars.map((par: number | null, i: number) => (
            <td key={i} className={parCell}>
              {par === null ? "–" : par}
            </td>
          ))}
          <td className={bandTotal}>
            {pars.some((p) => p !== null)
              ? pars.reduce((sum: number, p: number | null) => sum + (p || 0), 0)
              : "–"}
          </td>
        </tr>
      );
    })();

  const scoreRow = roundData?.holes?.scores?.length
    ? (() => {
      const pars = Array.from({ length: 18 }, (_, i) => roundData.holes?.par?.[i] ?? null);
      const scoreTotal = roundData.holes.scores
        .filter((s: number | null): s is number => s !== null)
        .reduce((sum: number, s: number) => sum + s, 0);

      return (
        <tr className={`${band} ${rowDivider}`}>
          <th className={`${rowLabelBand} align-middle`} scope="row">
            <div className={`${scoreRowSlot} justify-start`}>Score</div>
          </th>
          {roundData.holes.scores.map((score: number | null, i: number) => {
            const par = pars[i];
            if (score === null || par === null) {
              return (
                <td key={i} className={`${scoreCell} ${band} text-slate-600 ${holeCol} align-middle`}>
                  <div className={scoreRowSlot}>
                    <span className="text-slate-500">–</span>
                  </div>
                </td>
              );
            }
            return <ScoreDisplay key={i} score={score} par={par} cellClassName={band} />;
          })}
          <td className={`${bandTotal} !py-2.5 align-middle`}>
            <div className={scoreRowSlot}>
              {roundData.holes.scores.some((s: number | null) => s !== null) ? scoreTotal : "–"}
            </div>
          </td>
        </tr>
      );
    })()
    : null;

  const pointsRow = roundData?.holes?.stableford?.length
    ? (() => {
      const stableford = roundData.holes.stableford;
      const total = stableford.reduce((sum: number, p: number | null) => sum + (p === null ? 0 : p), 0);

      return (
        <tr className="border-t border-slate-200 bg-white">
          <th className={rowLabelPoints} scope="row">
            Points
          </th>
          {stableford.map((points: number | null, i: number) =>
            points === null ? (
              <td key={i} className={pointsCell} />
            ) : (
              <StablefordDisplay key={i} points={points} hideZero />
            ),
          )}
          <td className={pointsTotal}>{total === 0 ? "" : total}</td>
        </tr>
      );
    })()
    : null;

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        {hasHoleData ? (
          <table className="min-w-full border-collapse">
            <thead>
              {holeRow}
              {parRow}
              {scoreRow}
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
