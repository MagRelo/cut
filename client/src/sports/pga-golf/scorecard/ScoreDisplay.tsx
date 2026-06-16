import React from "react";

const cellY = "border-y border-slate-200";
const holeCol = "min-w-[2.25rem] w-[2.25rem]";

const scoreCell = `px-2 py-2.5 text-center text-xs tabular-nums ${cellY}`;
const pointsRowY = "!py-3.5";
const pointsCell = `${scoreCell} bg-white ${holeCol} ${pointsRowY}`;

const scoreRowSlot = "flex h-7 w-full shrink-0 items-center justify-center";

const scoreNum = "text-xs font-medium tabular-nums text-slate-600";

const scoreChip = {
  eagleOrBetter:
    "inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-400/10",
  birdie:
    "inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500",
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
    points > 0
      ? "font-semibold text-emerald-600/90"
      : points < 0
        ? "font-semibold text-red-500/90"
        : "text-slate-700";

  const displayValue = points > 0 ? `+${points}` : points.toString();

  return <td className={`${pointsCell} ${tone} ${cellClassName}`.trim()}>{displayValue}</td>;
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
