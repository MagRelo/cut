import React from 'react';
import type { Player } from '../../types/player';
import { PlayerStats } from './PlayerStats';

interface PlayerSelectionCardProps {
  player: Player;
  isSelected: boolean;
  onClick: () => void;
}

export const PlayerSelectionCard: React.FC<PlayerSelectionCardProps> = ({
  player,
  isSelected,
  onClick,
}) => {
  const handleClick = () => {
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isSelected}
      className={`w-full px-4 py-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-gray-200 border-gray-300 cursor-not-allowed'
          : 'bg-white border-gray-300 hover:border-emerald-500 hover:shadow-md'
      }`}>
      <PlayerStats player={player} />
    </button>
  );
};
