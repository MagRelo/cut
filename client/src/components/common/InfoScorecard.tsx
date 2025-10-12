import React from 'react';
import { ScoreDisplay, StablefordDisplay } from '../player/PlayerScorecard';

// Dummy data for 7 holes
const dummyPars = [5, 3, 4, 4, 5];
const dummyScores = [7, 4, 4, 3, 3];
const dummyStableford = [-3, -1, 0, 3, 5];

export const InfoScorecard: React.FC = () => {
  return (
    <div className='bg-gray-100'>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y'>
          <thead>
            <tr className='bg-gray-200'>
              <th className='px-3 py-2 text-left text-xs font-bold text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-r border-gray-300'>
                Hole
              </th>
              {[...Array(5)].map((_, i) => (
                <th
                  key={i}
                  className='px-2 py-2 text-center text-xs font-bold text-gray-500 min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300'>
                  {i + 7}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Par row */}
            <tr className='border-t border-gray-200'>
              <td className='px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-r border-gray-300'>
                Par
              </td>
              {dummyPars.map((par, i) => (
                <td
                  key={i}
                  className='px-2 py-2 text-center text-xs font-medium text-gray-500 min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300'>
                  {par}
                </td>
              ))}
            </tr>
            {/* Score row */}
            <tr className='border-t border-gray-200 bg-white'>
              <td className='px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-r border-gray-300'>
                Score
              </td>
              {dummyScores.map((score, i) => (
                <ScoreDisplay key={i} score={score} par={dummyPars[i]} />
              ))}
            </tr>
            {/* Stableford row */}
            <tr className='border-t border-gray-200 bg-gray-50'>
              <td className='px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-r border-gray-300'>
                Stableford
              </td>
              {dummyStableford.map((points, i) => (
                <StablefordDisplay key={i} points={points} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InfoScorecard;
