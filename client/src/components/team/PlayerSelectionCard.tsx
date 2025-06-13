import React from 'react';
import type { PlayerWithTournamentData } from '../../types.new/player';
import { PlayerStats } from './PlayerSelectionStats';

interface PlayerSelectionCardProps {
  player: PlayerWithTournamentData | null;
  isSelected: boolean;
  onClick: () => void;
  iconType?: 'pencil' | 'check';
}

export const PlayerSelectionCard: React.FC<PlayerSelectionCardProps> = ({
  player,
  isSelected,
  onClick,
  iconType,
}) => {
  const handleClick = () => {
    onClick();
  };

  const getIconPath = () => {
    if (iconType === 'check') {
      return 'M5 13l4 4L19 7';
    }
    return 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z';
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full px-4 py-3 rounded-lg border transition-all relative ${
        isSelected
          ? 'bg-gray-200 border-gray-300'
          : 'bg-white border-gray-300 shadow-md'
      }`}>
      {iconType && (
        <div className='absolute top-3 right-3 p-1 rounded-md border border-emerald-500'>
          <svg
            className='w-4 h-4 text-emerald-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d={getIconPath()}
            />
          </svg>
        </div>
      )}
      <PlayerStats player={player || undefined} />
    </button>
  );
};
