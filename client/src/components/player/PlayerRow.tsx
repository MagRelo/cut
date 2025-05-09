import React from 'react';
import { PlayerScorecard } from './PlayerScorecard';
import type { TeamPlayer } from '../../services/api';

interface PlayerRowProps {
  player: TeamPlayer;
  isExpanded: boolean;
  onToggle: (playerId: string) => void;
}

export const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  isExpanded,
  onToggle,
}) => {
  return (
    <React.Fragment>
      <tr className='hover:bg-gray-50/50'>
        <td className='px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-600 text-center'>
          {player.leaderboardPosition || '-'}
        </td>
        <td className='py-2 pl-2 pr-3 whitespace-nowrap'>
          <div className='flex items-center'>
            {player.player.pga_imageUrl && (
              <div className='flex-shrink-0 h-10 w-10 relative'>
                <img
                  className='h-10 w-10 rounded-full object-cover ring-2 ring-white'
                  src={player.player.pga_imageUrl}
                  alt={player.player.pga_displayName || ''}
                />
              </div>
            )}
            <div className='ml-4'>
              <button
                onClick={() => onToggle(player.id)}
                className='text-sm font-medium text-gray-900 flex items-center gap-2 hover:text-emerald-600'>
                {player.player.pga_displayName || ''}
                <svg
                  className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              </button>
            </div>
          </div>
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center font-medium text-gray-900'>
          {player.total ?? '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r1?.total !== undefined ? player.r1.total : '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r2?.total !== undefined ? player.r2.total : '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r3?.total !== undefined ? player.r3.total : '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r4?.total !== undefined ? player.r4.total : '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.cut ?? '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.bonus ?? '-'}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} className='p-0'>
            <div className='border-t border-gray-200'>
              <PlayerScorecard
                player={player}
                className='rounded-none shadow-none'
              />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};
