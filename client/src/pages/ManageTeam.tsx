import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { Team } from '../types/team';
import api, { getPGATourPlayers } from '../services/api';

type EditMode = 'none' | 'team' | 'active';

export default function ManageTeam() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editedTeam, setEditedTeam] = useState<Team | null>(null);
  const [pgaPlayers, setPGAPlayers] = useState<
    Array<{ id: string; name: string; firstName: string; lastName: string }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [teamData, playersData] = await Promise.all([
          api.getTeam(teamId!),
          getPGATourPlayers(),
        ]);
        setTeam(teamData);
        setEditedTeam(teamData);
        setPGAPlayers(playersData);
      } catch {
        setError('Failed to load team data');
      } finally {
        setIsLoading(false);
      }
    };

    if (teamId) {
      fetchData();
    }
  }, [teamId]);

  const handleSave = async () => {
    if (!editedTeam || !teamId) return;

    if (
      editMode === 'team' &&
      editedTeam.players.some((p) => !p.id || p.id.startsWith('empty-'))
    ) {
      alert('Please select all 8 players before saving.');
      return;
    }

    if (editMode === 'active') {
      const activeCount = editedTeam.players.filter((p) => p.isActive).length;
      if (activeCount > 4) {
        alert('You can only select up to 4 players for the current week.');
        return;
      }
    }

    setError(null);
    setIsSaving(true);

    try {
      let updatedTeam: Team;

      if (editMode === 'team') {
        updatedTeam = await api.updateTeam(teamId, {
          name: editedTeam.name,
          players: editedTeam.players.map((p) => ({ id: p.id, name: p.name })),
        });
      } else {
        // editMode === 'active'
        const activePlayerIds = editedTeam.players
          .filter((p) => p.isActive)
          .map((p) => p.id);

        updatedTeam = await api.setActivePlayers({
          teamId,
          activePlayerIds,
        });
      }

      setTeam(updatedTeam);
      setEditedTeam(updatedTeam);
      setEditMode('none');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred while saving'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedTeam(team);
    setEditMode('none');
  };

  const handlePlayerSelect = (playerId: string, position: number) => {
    if (!editedTeam) return;

    const selectedPlayer = pgaPlayers.find((p) => p.id === playerId);
    if (!selectedPlayer) return;

    const updatedPlayers = [...editedTeam.players];
    updatedPlayers[position] = {
      ...updatedPlayers[position],
      id: selectedPlayer.id,
      name: selectedPlayer.name,
      pgaTourId: selectedPlayer.id,
      isActive: position < 4,
    };

    setEditedTeam({
      ...editedTeam,
      players: updatedPlayers,
    });
  };

  const togglePlayerActive = (index: number) => {
    if (!editedTeam) return;

    const activeCount = editedTeam.players.filter((p) => p.isActive).length;
    const player = editedTeam.players[index];

    if (!player.isActive && activeCount >= 4) {
      alert('You can only select up to 4 players for the current week.');
      return;
    }

    const newPlayers = [...editedTeam.players];
    newPlayers[index] = {
      ...player,
      isActive: !player.isActive,
    };

    setEditedTeam({
      ...editedTeam,
      players: newPlayers,
    });
  };

  if (isLoading) {
    return (
      <div className='py-6'>
        <div className='flex items-center justify-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
        </div>
      </div>
    );
  }

  if (!team || !editedTeam) {
    return (
      <div className='py-6'>
        <div className='text-center text-gray-600'>Team not found</div>
      </div>
    );
  }

  const activePlayerCount =
    editedTeam.players?.filter((p) => p.isActive).length ?? 0;

  return (
    <div className='py-6'>
      {error && (
        <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-md'>
          <div className='text-sm text-red-800'>{error}</div>
        </div>
      )}

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-blue-900'>Manage Team</h1>
      </div>

      <div className='bg-white rounded-lg shadow-sm p-6'>
        <div className='flex justify-between items-center mb-6'>
          <div>
            {editMode === 'team' ? (
              <input
                type='text'
                value={editedTeam.name}
                onChange={(e) =>
                  setEditedTeam({ ...editedTeam, name: e.target.value })
                }
                className='text-xl font-semibold px-2 py-1 border rounded'
              />
            ) : (
              <h2 className='text-xl font-semibold'>{team.name}</h2>
            )}
          </div>
          <div className='space-x-2'>
            {editMode === 'none' ? (
              <>
                <button
                  onClick={() => setEditMode('team')}
                  className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'>
                  Edit Team
                </button>
                <button
                  onClick={() => setEditMode('active')}
                  className='px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700'>
                  Set Active Players
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}>
                  {isSaving ? (
                    <>
                      <svg
                        className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'>
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'></circle>
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className='px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className='space-y-6'>
          {editMode === 'team' && (
            <div>
              <h3 className='text-lg font-medium mb-2'>Team Details</h3>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Team Name
                  </label>
                  <input
                    type='text'
                    value={editedTeam.name}
                    onChange={(e) =>
                      setEditedTeam({ ...editedTeam, name: e.target.value })
                    }
                    className='mt-1 block w-full px-3 py-2 border rounded-md shadow-sm'
                  />
                </div>
              </div>
            </div>
          )}

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
                  {(editedTeam.players ?? []).map((player, index) => (
                    <tr key={index} className='border-b'>
                      <td className='py-2'>
                        {editMode === 'team' ? (
                          <select
                            value={player.id || ''}
                            onChange={(e) =>
                              handlePlayerSelect(e.target.value, index)
                            }
                            className='w-full px-2 py-1 border rounded'>
                            <option value=''>Select a player...</option>
                            {pgaPlayers
                              .filter(
                                (p) => p && p.id && p.firstName && p.lastName
                              )
                              .sort((a, b) =>
                                a.lastName.localeCompare(b.lastName)
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
                            onChange={() => togglePlayerActive(index)}
                            disabled={!player.id}
                            className='h-4 w-4 text-blue-600 rounded border-gray-300 disabled:opacity-50'
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {editMode === 'none' && (
            <div>
              <h3 className='text-lg font-medium mb-2'>Team Stats</h3>
              <div className='grid grid-cols-1 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Player Count
                  </label>
                  <div className='mt-1 text-gray-900'>
                    {
                      (editedTeam.players ?? []).filter(
                        (p) => p.id && !p.id.startsWith('empty-')
                      ).length
                    }{' '}
                    / 8
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
