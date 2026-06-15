import React from "react";
import type { RoundData, TournamentPlayerData } from "../../types/player";
import { ScoreDisplay, StablefordDisplay } from "../../components/player/PlayerScorecard";
import { getTeeTimeLabelForRound } from "../../components/player/playerRoundUtils";

const band = "bg-slate-100";
const rowDivider = "border-t border-slate-200/80";
const cellY = "border-y border-slate-200";

const holeCol = "min-w-[2.25rem] w-[2.25rem]";
const totalCol = "min-w-[3.5rem] w-[3.5rem]";

const rowLabelBase =
  "sticky left-0 z-10 border-r border-slate-200 px-3 text-left align-middle text-xs font-display font-semibold uppercase tracking-wide text-slate-500 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]";

const rowLabelBand = `${rowLabelBase} ${cellY} ${band} py-2.5 ${totalCol}`;
const pointsRowY = "!py-3.5";

const rowLabelPoints = `${rowLabelBase} ${cellY} bg-white ${pointsRowY} ${totalCol}`;

const scoreCell = `px-2 py-2.5 text-center text-xs tabular-nums ${cellY}`;

const holeHeader = `${cellY} ${band} px-2 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-500 ${holeCol}`;

const parCell = `${cellY} ${band} px-2 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-500 ${holeCol}`;

const bandTotal = `${cellY} border-l border-slate-200 ${band} px-3 py-2 text-center font-display text-xs font-medium tabular-nums text-slate-600 ${totalCol}`;

const scoreRowSlot = "flex h-7 w-full shrink-0 items-center justify-center";

const pointsCell = `${scoreCell} bg-white ${holeCol} ${pointsRowY}`;
const pointsTotal = `${cellY} border-l border-slate-200 bg-white px-3 py-3.5 text-center text-xs tabular-nums text-slate-900 ${totalCol}`;

interface GolfParticipantScorecardProps {
  tournamentData: TournamentPlayerData | undefined;
  selectedRound: number;
}

export const GolfParticipantScorecard: React.FC<GolfParticipantScorecardProps> = ({
  tournamentData,
  selectedRound,
}) => {
  const getRoundData = (roundNumber: number) => {
    const roundKey = `r${roundNumber}` as keyof Pick<
      TournamentPlayerData,
      "r1" | "r2" | "r3" | "r4"
    >;
    return tournamentData?.[roundKey] as RoundData | undefined;
  };

  const roundData = getRoundData(selectedRound);
  const hasHoleData = roundData?.holes?.scores?.[0] != null;
  const teeTimeLabel = getTeeTimeLabelForRound(tournamentData, `r${selectedRound}`);

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
                  <td
                    key={i}
                    className={`${scoreCell} ${band} text-slate-600 ${holeCol} align-middle`}
                  >
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
        const total = stableford.reduce(
          (sum: number, p: number | null) => sum + (p === null ? 0 : p),
          0,
        );

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
          <div className="border-t border-slate-200 px-6 py-10 text-center font-display text-sm text-slate-600">
            {teeTimeLabel ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Round {selectedRound} tee time
                </p>
                <p className="mt-1 text-base font-medium text-slate-800">{teeTimeLabel}</p>
              </>
            ) : (
              <p>No scorecard data available for Round {selectedRound}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
