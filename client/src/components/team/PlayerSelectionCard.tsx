import React from 'react';
import type { PlayerWithTournamentData } from '../../types.new/player';
import { PlayerStats } from './PlayerStats';

interface PlayerSelectionCardProps {
  player: PlayerWithTournamentData | null;
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
      className={`w-full px-4 py-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-gray-200 border-gray-300'
          : 'bg-white border-gray-300 shadow-md'
      }`}>
      <PlayerStats player={player || undefined} />
    </button>
  );
};
