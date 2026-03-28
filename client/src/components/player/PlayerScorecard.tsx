import React from "react";
import type { PlayerWithTournamentData, RoundData, TournamentPlayerData } from "../../types/player";

interface StablefordDisplayProps {
  points: number;
}

export const StablefordDisplay: React.FC<StablefordDisplayProps> = ({ points }) => {
  let pointsClass = "text-gray-600";
  if (points > 0) pointsClass = "text-emerald-600 font-semibold";
  else if (points < 0) pointsClass = "text-red-600 font-semibold";

  const displayValue = points > 0 ? `+${points}` : points.toString();

  return (
    <td
      className={`px-2 py-2 text-center text-xs ${pointsClass} min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300`}
    >
      {displayValue}
    </td>
  );
};

interface ScoreDisplayProps {
  score: number;
  par: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, par }) => {
  const scoreDiff = score - par;
  let content: React.ReactNode = score;

  if (scoreDiff < -1) {
    content = (
      <span className="inline-flex items-center justify-center w-6 h-6 border-2 border-emerald-500 rounded-full bg-emerald-100">
        {score}
      </span>
    );
  } else if (scoreDiff === -1) {
    content = (
      <span className="inline-flex items-center justify-center w-6 h-6 border-2 border-emerald-500 rounded-full">
        {score}
      </span>
    );
  } else if (scoreDiff === 1) {
    content = (
      <span className="inline-flex items-center justify-center w-6 h-6 border-2 border-red-400">
        {score}
      </span>
    );
  } else if (scoreDiff > 1) {
    content = (
      <span className="inline-flex items-center justify-center w-6 h-6 border-2 border-red-400 bg-red-100">
        {score}
      </span>
    );
  }

  return (
    <td className="px-2 py-2 text-center text-xs text-gray-600 min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300">
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

  const renderHoleNumbers = () => (
    <tr className="bg-gray-200">
      <th className="sticky left-0 z-10 bg-gray-200 px-3 py-2 text-left text-xs font-bold font-display text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-r border-gray-300">
        Round {selectedRound}
      </th>
      {Array.from({ length: 18 }, (_, i) => (
        <th
          key={i}
          className="px-2 py-2 text-center text-xs font-bold text-gray-500 min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300"
        >
          {i + 1}
        </th>
      ))}
      <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-l border-gray-300">
        Total
      </th>
    </tr>
  );

  const renderPars = () => {
    if (!roundData?.holes) return null;

    const pars = Array(18)
      .fill(null)
      .map((_, i) => roundData.holes?.par?.[i] ?? null);

    return (
      <tr className="border-t border-gray-200 bg-gray-50">
        <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-medium font-display text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-r border-gray-300">
          Par
        </td>
        {pars.map((par: number | null, i: number) => (
          <td
            key={i}
            className="px-2 py-2 text-center text-xs font-medium text-gray-500 min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300"
          >
            {par === null ? "-" : par}
          </td>
        ))}
        <td className="px-3 py-2 text-center text-xs font-medium text-gray-600 min-w-[3.5rem] w-[3.5rem] border-t border-b border-l border-gray-300">
          {pars.some((par) => par !== null)
            ? pars.reduce((sum: number, par: number | null) => sum + (par || 0), 0)
            : "-"}
        </td>
      </tr>
    );
  };

  const renderScores = () => {
    if (!roundData?.holes?.scores?.length) return null;

    const pars = Array(18)
      .fill(null)
      .map((_, i) => roundData.holes?.par?.[i] ?? null);

    const scoreTotal = roundData.holes.scores
      .filter((score: number | null): score is number => score !== null)
      .reduce((sum: number, score: number) => sum + score, 0);

    return (
      <tr className="border-t border-gray-200 bg-gray-50">
        <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-medium font-display text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-r border-gray-300">
          Score
        </td>
        {roundData.holes.scores.map((score: number | null, i: number) => {
          const par = pars[i];
          if (score === null || par === null) {
            return (
              <td
                key={i}
                className="px-2 py-2 text-center text-xs text-gray-600 min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300"
              >
                -
              </td>
            );
          }
          return <ScoreDisplay key={i} score={score} par={par} />;
        })}
        <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 min-w-[3.5rem] w-[3.5rem] border-t border-b border-l border-gray-300">
          {roundData.holes.scores.some((score: number | null) => score !== null) ? scoreTotal : "-"}
        </td>
      </tr>
    );
  };

  const renderStableford = () => {
    if (!roundData?.holes?.stableford?.length) return null;
    return (
      <tr className="border-t border-gray-200 bg-gray-50">
        <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-medium font-display text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-r border-gray-300">
          Stableford
        </td>
        {roundData.holes.stableford.map((points: number | null, i: number) => {
          if (points === null) {
            return (
              <td
                key={i}
                className="px-2 py-2 text-center text-xs text-gray-600 min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300"
              >
                -
              </td>
            );
          }
          return <StablefordDisplay key={i} points={points} />;
        })}
        <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 min-w-[3.5rem] w-[3.5rem] border-t border-b border-l border-gray-300">
          {roundData.holes.stableford.reduce(
            (sum: number, points: number | null) => sum + (points === null ? 0 : points),
            0
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        {hasHoleData ? (
          <table className="min-w-full divide-y">
            <thead>{renderHoleNumbers()}</thead>
            <tbody>
              {renderPars()}
              {renderScores()}
              {renderStableford()}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No scorecard data available for Round {selectedRound}
          </div>
        )}
      </div>
    </div>
  );
};
