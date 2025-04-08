import React from 'react';
import { PlayerRow } from './PlayerRow';
import type { PGAPlayer } from '../../schemas/team';

interface PlayerTableProps {
  players: Array<{
    id: string;
    name: string;
    isActive?: boolean;
  }>;
  editMode: 'none' | 'team' | 'active';
  pgaPlayers?: PGAPlayer[];
  activePlayerCount?: number;
  onPlayerSelect?: (playerId: string, index: number) => void;
  onToggleActive?: (index: number) => void;
}

export const PlayerTable: React.FC<PlayerTableProps> = ({
  players,
  editMode,
  pgaPlayers,
  activePlayerCount,
  onPlayerSelect,
  onToggleActive,
}) => {
  return (
    <div>
      <div className='flex justify-between items-center mb-2'>
        <h3 className='text-lg font-medium'>
          {editMode === 'active' ? 'Select Active Players' : 'Players'}
        </h3>
        {editMode === 'active' && (
          <div className='text-sm text-gray-600'>
            Active Players: {activePlayerCount} / 4
          </div>
        )}
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-gray-500 border-b'>
              <th className='text-left py-2'>Name</th>
              {editMode === 'active' && (
                <th className='text-center py-2'>Active</th>
              )}
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <PlayerRow
                key={index}
                player={player}
                index={index}
                editMode={editMode}
                pgaPlayers={pgaPlayers}
                onPlayerSelect={onPlayerSelect}
                onToggleActive={onToggleActive}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
