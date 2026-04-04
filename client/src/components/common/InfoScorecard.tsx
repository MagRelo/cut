import React from "react";
import { ScoreDisplay, StablefordDisplay } from "../player/PlayerScorecard";

// Dummy sample (holes 7–11) — table classes copied from PlayerScorecard
const dummyPars = [5, 4, 4, 3, 5];
const dummyScores = [3, 3, 4, 4, 7];
const dummyStableford = [+5, +3, 0, -1, -3];

const band = "bg-slate-100";
const rowDivider = "border-t border-slate-200/80";
const cellY = "border-y border-slate-200";

const holeCol = "min-w-[2.25rem] w-[2.25rem]";
/** First column: row labels — ~3.35rem fits POINTS + padding without matching the old 3.5rem+px-3 feel */
const labelCol = "w-[3.35rem] min-w-[3.35rem] max-w-[3.35rem] box-border whitespace-nowrap";

const rowLabelBase =
  "sticky left-0 z-10 border-r border-slate-200 px-2 text-left align-middle text-xs font-display font-semibold uppercase text-slate-500 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]";

const rowLabelBand = `${rowLabelBase} ${cellY} ${band} py-2.5 ${labelCol}`;
const pointsRowY = "!py-3.5";

const rowLabelPoints = `${rowLabelBase} ${cellY} bg-white ${pointsRowY} ${labelCol}`;

const holeHeader = `${cellY} ${band} px-2 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-500 ${holeCol}`;

const parCell = `${cellY} ${band} px-2 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-500 ${holeCol}`;

export const InfoScorecard: React.FC = () => {
  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className={band}>
              <th className={rowLabelBand} scope="row">
                Hole
              </th>
              {dummyPars.map((_, i) => (
                <th key={i} className={holeHeader}>
                  {i + 7}
                </th>
              ))}
            </tr>
            <tr className={`${band} ${rowDivider}`}>
              <th className={rowLabelBand} scope="row">
                Par
              </th>
              {dummyPars.map((par, i) => (
                <td key={i} className={parCell}>
                  {par}
                </td>
              ))}
            </tr>
            <tr className={`${band} ${rowDivider}`}>
              <th className={`${rowLabelBand} align-middle`} scope="row">
                Score
              </th>
              {dummyScores.map((score, i) => (
                <ScoreDisplay key={i} score={score} par={dummyPars[i]} cellClassName={band} />
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200 bg-white">
              <th className={rowLabelPoints} scope="row">
                Points
              </th>
              {dummyStableford.map((points, i) => (
                <StablefordDisplay key={i} points={points} hideZero />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InfoScorecard;
