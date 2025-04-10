import React from 'react';
import type { PGAPlayer } from '../../schemas/team';

interface PlayerRowProps {
  player: {
    id: string;
    name: string;
    isActive?: boolean;
  };
  index: number;
  editMode: 'none' | 'team' | 'active';
  pgaPlayers?: PGAPlayer[];
  onPlayerSelect?: (playerId: string, index: number) => void;
  onToggleActive?: (index: number) => void;
}

export const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  index,
  editMode,
  pgaPlayers,
  onPlayerSelect,
  onToggleActive,
}) => {
  return (
    <tr className='border-b'>
      <td className='py-2'>
        {editMode === 'team' ? (
          <select
            value={player.id || ''}
            onChange={(e) => onPlayerSelect?.(e.target.value, index)}
            className='w-full px-2 py-1 border rounded'>
            <option value=''>Select a player...</option>
            {pgaPlayers
              ?.filter((p) => p && p.id && p.firstName && p.lastName)
              .sort((a, b) =>
                (a.lastName || '').localeCompare(b.lastName || '')
              )
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName}
                </option>
              ))}
          </select>
        ) : (
          <div className='flex items-center'>
            <span>{player.name || 'Empty slot'}</span>
          </div>
        )}
      </td>
      {editMode === 'active' && (
        <td className='text-center py-2'>
          <input
            type='checkbox'
            checked={player.isActive}
            onChange={() => onToggleActive?.(index)}
            disabled={!player.id}
            className='h-4 w-4 text-emerald-600 rounded border-gray-300 disabled:opacity-50'
          />
        </td>
      )}
    </tr>
  );
};
