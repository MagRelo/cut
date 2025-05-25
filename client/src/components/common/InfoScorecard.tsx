import React from 'react';

// Dummy data for 7 holes
const dummyPars = [5, 4, 4, 3, 5];
const dummyScores = [3, 3, 4, 4, 7];
const dummyStableford = [5, 3, 0, -1, -3];

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
              {dummyScores.map((score, i) => {
                const par = dummyPars[i];
                const scoreDiff = score - par;
                let content: React.ReactNode = score;
                if (scoreDiff < 0) {
                  content = (
                    <span className='inline-flex items-center justify-center w-6 h-6 border-2 border-emerald-500 rounded-full '>
                      {score}
                    </span>
                  );
                } else if (scoreDiff > 0) {
                  content = (
                    <span className='inline-flex items-center justify-center w-6 h-6 border-2 border-red-400 '>
                      {score}
                    </span>
                  );
                }
                return (
                  <td
                    key={i}
                    className='px-2 py-2 text-center text-xs text-gray-600 min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300'>
                    {content}
                  </td>
                );
              })}
            </tr>
            {/* Stableford row */}
            <tr className='border-t border-gray-200 bg-gray-50'>
              <td className='px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[3.5rem] w-[3.5rem] border-t border-b border-r border-gray-300'>
                Stableford
              </td>
              {dummyStableford.map((points, i) => {
                let pointsClass = 'text-gray-600';
                if (points > 0) pointsClass = 'text-emerald-600 font-bold';
                else if (points < 0) pointsClass = 'text-red-600 font-bold';
                return (
                  <td
                    key={i}
                    className={`px-2 py-2 text-center text-xs ${pointsClass} font-medium  min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300`}>
                    {points}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InfoScorecard;
