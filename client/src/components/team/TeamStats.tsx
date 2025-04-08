import React from 'react';
import type { Team } from '../../types/team';

interface TeamStatsProps {
  team: Team;
}

export const TeamStats: React.FC<TeamStatsProps> = ({ team }) => {
  const filledPlayerCount =
    team.players?.filter((p) => p.id && !p.id.startsWith('empty-')).length ?? 0;

  return (
    <div>
      <h3 className='text-lg font-medium mb-2'>Team Stats</h3>
      <div className='grid grid-cols-1 gap-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700'>
            Player Count
          </label>
          <div className='mt-1 text-gray-900'>{filledPlayerCount} / 8</div>
        </div>
      </div>
    </div>
  );
};
