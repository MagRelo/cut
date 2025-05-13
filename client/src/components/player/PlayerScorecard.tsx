import React, { useState } from 'react';
import type { TeamPlayer as BaseTeamPlayer, RoundData } from '../../types/team';

type TeamPlayer = Omit<BaseTeamPlayer, 'r1' | 'r2' | 'r3' | 'r4'> & {
  r1?: RoundData;
  r2?: RoundData;
  r3?: RoundData;
  r4?: RoundData;
};

interface PlayerScorecardProps {
  player: TeamPlayer;
  currentRound?: number;
  className?: string;
}

export const PlayerScorecard: React.FC<PlayerScorecardProps> = ({
  player,
  currentRound = 1,
  className = '',
}) => {
  // Get the round data for the selected round
  const getRoundData = (roundNumber: number) => {
    const roundKey = `r${roundNumber}` as keyof Pick<
      TeamPlayer,
      'r1' | 'r2' | 'r3' | 'r4'
    >;
    return player[roundKey];
  };

  // Find the latest round with data
  const getLatestRoundWithData = () => {
    for (let round = 4; round >= 1; round--) {
      const roundData = getRoundData(round);
      if (
        roundData?.holes?.scores?.some((score: number | null) => score !== null)
      ) {
        return round;
      }
    }
    return currentRound;
  };

  const [selectedRound, setSelectedRound] = useState(getLatestRoundWithData());

  const roundData = getRoundData(selectedRound);
  const hasHoleData =
    roundData?.holes?.scores && roundData.holes.scores.length > 0;

  // Function to render hole numbers (1-18)
  const renderHoleNumbers = () => (
    <tr className='bg-gray-50'>
      <th className='px-3 py-2 text-left text-xs font-medium text-gray-500'>
        Hole
      </th>
      {Array.from({ length: 18 }, (_, i) => (
        <th
          key={i}
          className='px-2 py-2 text-center text-xs font-medium text-gray-500'>
          {i + 1}
        </th>
      ))}
      <th className='px-3 py-2 text-center text-xs font-medium text-gray-500'>
        Total
      </th>
    </tr>
  );

  // Function to render par values
  const renderPars = () => {
    // If we have scores, we should have pars
    if (!roundData?.holes) return null;

    // Get pars from the API data, show '-' if not available
    const pars = Array(18)
      .fill(null)
      .map((_, i) => roundData.holes?.par?.[i] ?? null);

    return (
      <tr className='border-t border-gray-200'>
        <td className='px-3 py-2 text-left text-xs font-medium text-gray-500'>
          Par
        </td>
        {pars.map((par: number | null, i: number) => (
          <td key={i} className='px-2 py-2 text-center text-xs text-gray-600'>
            {par === null ? '-' : par}
          </td>
        ))}
        <td className='px-3 py-2 text-center text-xs font-medium text-gray-900'>
          {pars.some((par) => par !== null)
            ? pars.reduce(
                (sum: number, par: number | null) => sum + (par || 0),
                0
              )
            : '-'}
        </td>
      </tr>
    );
  };

  // Function to render scores
  const renderScores = () => {
    if (!roundData?.holes?.scores?.length) return null;

    // Get pars for score comparison
    const pars = Array(18)
      .fill(null)
      .map((_, i) => roundData.holes?.par?.[i] ?? null);

    // Calculate total of actual scores
    const scoreTotal = roundData.holes.scores
      .filter((score: number | null): score is number => score !== null)
      .reduce((sum: number, score: number) => sum + score, 0);

    return (
      <tr className='border-t border-gray-200'>
        <td className='px-3 py-2 text-left text-xs font-medium text-gray-500'>
          Score
        </td>
        {roundData.holes.scores.map((score: number | null, i: number) => {
          const par = pars[i];
          const scoreValue = score === null ? '-' : score;
          const scoreDiff = score === null || par === null ? 0 : score - par;

          let scoreClass = 'text-gray-600';
          if (score !== null && par !== null) {
            if (scoreDiff < 0) scoreClass = 'text-emerald-600 font-medium';
            else if (scoreDiff > 0) scoreClass = 'text-red-600 font-medium';
          }

          return (
            <td
              key={i}
              className={`px-2 py-2 text-center text-xs ${scoreClass}`}>
              {scoreValue}
            </td>
          );
        })}
        <td className='px-3 py-2 text-center text-xs font-medium text-gray-900'>
          {roundData.holes.scores.some((score: number | null) => score !== null)
            ? scoreTotal
            : '-'}
        </td>
      </tr>
    );
  };

  // Function to render stableford scores
  const renderStableford = () => {
    if (!roundData?.holes?.stableford?.length) return null;
    return (
      <tr className='border-t border-gray-200'>
        <td className='px-3 py-2 text-left text-xs font-medium text-gray-500'>
          Stableford
        </td>
        {roundData.holes.stableford.map((points: number | null, i: number) => {
          let pointsClass = 'text-gray-600';
          if (points !== null) {
            if (points > 0) pointsClass = 'text-emerald-600 font-medium';
            else if (points < 0) pointsClass = 'text-red-600 font-medium';
          }

          return (
            <td
              key={i}
              className={`px-2 py-2 text-center text-xs ${pointsClass}`}>
              {points === null ? '-' : points}
            </td>
          );
        })}
        <td className='px-3 py-2 text-center text-xs font-medium text-gray-900'>
          {roundData.holes.stableford.reduce(
            (sum: number, points: number | null) =>
              sum + (points === null ? 0 : points),
            0
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className={`bg-gray-100 rounded shadow ${className}`}>
      {/* Round selector */}
      <div className='px-1 py-1 border-b border-gray-200'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <span className='text-xs font-medium text-gray-500 pl-1'>
              Round:
            </span>
            <div className='flex space-x-1'>
              {[1, 2, 3, 4].map((round) => {
                const roundData = getRoundData(round);
                const isActive = selectedRound === round;
                const hasData = !!roundData?.holes?.scores?.some(
                  (score) => score !== null
                );

                if (!hasData) return null;

                return (
                  <button
                    key={round}
                    onClick={() => setSelectedRound(round)}
                    className={`
                      px-2 py-0.5 text-xs font-medium rounded-md border
                      ${
                        isActive
                          ? 'bg-white text-gray-900 border-emerald-500'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                      }
                    `}>
                    {round}
                  </button>
                );
              })}
            </div>
          </div>
          {roundData?.ratio !== undefined && roundData.ratio < 1 && (
            <span className='text-xs text-gray-500'>
              {Math.round(roundData.ratio * 18)} holes completed
            </span>
          )}
        </div>
      </div>

      {/* Scorecard table */}
      <div className='overflow-x-auto'>
        {hasHoleData ? (
          <table className='min-w-full divide-y divide-gray-200'>
            <thead>{renderHoleNumbers()}</thead>
            <tbody>
              {renderPars()}
              {renderScores()}
              {renderStableford()}
            </tbody>
          </table>
        ) : (
          <div className='p-8 text-center text-gray-500'>
            No scorecard data available for Round {selectedRound}
          </div>
        )}
      </div>
    </div>
  );
};
