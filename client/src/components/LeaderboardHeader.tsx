import React from 'react';

interface LeaderboardHeaderProps {
  tournamentName: string;
  courseName: string;
  round: string;
}

export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  tournamentName,
  courseName,
  round,
}) => {
  return (
    <div className='mb-6'>
      <h1 className='text-2xl font-bold text-emerald-600 mb-1'>
        {tournamentName}
      </h1>
      <div className='text-gray-600'>{courseName}</div>
      <div className='text-sm text-gray-500 mt-1'>{round}</div>
    </div>
  );
};
