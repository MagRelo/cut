import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import type { Player } from '../../types/player';
import { PlayerSelectionCard } from './PlayerSelectionCard';

interface PlayerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (playerId: string | null) => void;
  availablePlayers: Player[];
  selectedPlayers: string[];
}

type SortField = 'name' | 'owgr' | 'fedex';
type SortDirection = 'asc' | 'desc';

export const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  availablePlayers,
  selectedPlayers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('fedex');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredPlayers = availablePlayers
    .filter((player) => {
      const fullName = `${player.pga_firstName || ''} ${
        player.pga_lastName || ''
      }`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.pga_lastName || '').localeCompare(
            b.pga_lastName || ''
          );
          break;
        case 'owgr':
          comparison = (a.pga_owgr || Infinity) - (b.pga_owgr || Infinity);
          break;
        case 'fedex':
          comparison = (a.pga_fedex || Infinity) - (b.pga_fedex || Infinity);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
      <div className='fixed inset-0 bg-black/30' aria-hidden='true' />

      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <Dialog.Panel className='mx-auto max-w-4xl w-full bg-white rounded-xl shadow-lg'>
          <div className='p-6'>
            <Dialog.Title className='text-xl font-semibold text-gray-900 mb-4'>
              Select a Player
            </Dialog.Title>

            {/* Search and Sort Controls */}
            <div className='mb-4 space-y-4'>
              <div className='relative'>
                <input
                  type='text'
                  placeholder='Search players...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                />
              </div>

              <div className='flex gap-4'>
                <button
                  onClick={() => toggleSort('name')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    sortField === 'name'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  Name{' '}
                  {sortField === 'name' &&
                    (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => toggleSort('owgr')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    sortField === 'owgr'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  OWGR{' '}
                  {sortField === 'owgr' &&
                    (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => toggleSort('fedex')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    sortField === 'fedex'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  FedEx{' '}
                  {sortField === 'fedex' &&
                    (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>

            {/* Player Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-2'>
              {filteredPlayers.map((player) => (
                <PlayerSelectionCard
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayers.includes(player.id)}
                  onClick={() => onSelect(player.id)}
                />
              ))}
            </div>

            {/* Close Button */}
            <div className='mt-6 flex justify-end space-x-4'>
              <button
                onClick={() => onSelect(null)}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200'>
                Leave Empty
              </button>
              <button
                onClick={onClose}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200'>
                Close
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
