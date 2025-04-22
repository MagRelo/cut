import React, { useState, useEffect } from 'react';
import type { PGAPlayer, TeamUpdatePayload } from '../../schemas/team';
import type { Team } from '../../services/api';
import { api } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

interface TeamFormProps {
  teamId?: string;
  leagueId: string;
  onSuccess: (teamId: string, leagueId: string) => void;
  onCancel: () => void;
  initialTeam?: Team;
  tournamentStatus?: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
}

export const TeamFormComponent: React.FC<TeamFormProps> = ({
  teamId,
  leagueId,
  onSuccess,
  onCancel,
  initialTeam,
  tournamentStatus,
}) => {
  const isEditMode = !!teamId;
  const isFormDisabled = isEditMode && tournamentStatus !== 'UPCOMING';

  const [teamName, setTeamName] = useState(initialTeam?.name || '');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(
    initialTeam?.players.map((p) => p.player.id) || []
  );
  const [teamColor, setTeamColor] = useState(initialTeam?.color || '#059669');
  const [availablePlayers, setAvailablePlayers] = useState<PGAPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(initialTeam || null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const players = await api.getPGATourPlayers();
        setAvailablePlayers(players);

        if (isEditMode && teamId && !initialTeam) {
          const teamData = await api.getTeam(teamId);
          setTeam(teamData);
          setTeamName(teamData.name);
          setSelectedPlayers(teamData.players.map((p) => p.player.id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamId, isEditMode, initialTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    if (selectedPlayers.length !== 4) {
      setError('Please select exactly 4 players');
      return;
    }

    if (!isEditMode && !leagueId) {
      setError('League ID is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isEditMode && teamId) {
        const updatePayload: TeamUpdatePayload = {
          name: teamName,
          players: selectedPlayers,
          color: teamColor,
        };
        await api.updateTeam(teamId, updatePayload);
        onSuccess(teamId, team?.leagueId || '');
      } else if (leagueId) {
        const newTeam = await api.createTeam({
          name: teamName,
          leagueId,
          players: selectedPlayers,
          color: teamColor,
        });
        onSuccess(newTeam.id, leagueId);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${isEditMode ? 'update' : 'create'} team`
      );
      setIsSaving(false);
    }
  };

  const handlePlayerSelect = (
    e: React.ChangeEvent<HTMLSelectElement>,
    index: number
  ) => {
    const playerId = e.target.value;
    setSelectedPlayers((prev) => {
      const newPlayers = [...prev];
      newPlayers[index] = playerId;
      return newPlayers;
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isEditMode && !team && !initialTeam) {
    return <div className='text-center text-gray-600'>Team not found</div>;
  }

  return (
    <div className='space-y-8'>
      {error && <ErrorMessage message={error} />}

      {isSaving && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-8 rounded-lg shadow-xl flex flex-col items-center space-y-4'>
            <LoadingSpinner />
            <p className='text-lg text-gray-700'>
              Creating team & calculating player scores...
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-8'>
        {isEditMode && tournamentStatus !== 'UPCOMING' && (
          <div className='bg-yellow-50 border-l-4 border-yellow-400 p-4'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <svg
                  className='h-5 w-5 text-yellow-400'
                  viewBox='0 0 20 20'
                  fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <p className='text-sm text-yellow-700'>
                  Team changes are only allowed before the tournament begins.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className='space-y-6'>
          <div>
            <label
              htmlFor='teamName'
              className='block text-sm font-medium text-gray-900'>
              Team Name
            </label>
            <div className='mt-1'>
              <input
                type='text'
                id='teamName'
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className='appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-base disabled:bg-gray-100 disabled:text-gray-500'
                placeholder='Enter your team name'
                disabled={isFormDisabled}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor='teamColor'
              className='block text-sm font-medium text-gray-900'>
              Team Color
            </label>
            <div className='mt-1 flex items-center gap-3'>
              <input
                type='color'
                id='teamColor'
                value={teamColor}
                onChange={(e) => setTeamColor(e.target.value)}
                className='h-10 w-20 rounded border border-gray-300 p-1 disabled:opacity-50'
                disabled={isFormDisabled}
              />
              <input
                type='text'
                value={teamColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(newColor)) {
                    setTeamColor(newColor);
                  }
                }}
                className='appearance-none w-32 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono disabled:bg-gray-100 disabled:text-gray-500'
                placeholder='#000000'
                maxLength={7}
                disabled={isFormDisabled}
              />
            </div>
          </div>

          <div className='space-y-4'>
            <h2 className='text-xl font-semibold text-gray-900'>
              Select Your Players
            </h2>
            <p className='text-sm text-gray-500'>
              Choose 4 players for your team. Each player can only be selected
              once.
            </p>
            <div className='space-y-4 mt-4'>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className='space-y-2'>
                  <label
                    htmlFor={`player-${index}`}
                    className='block text-sm font-medium text-gray-900'>
                    Player {index + 1}
                  </label>
                  <div className='relative'>
                    <select
                      id={`player-${index}`}
                      value={selectedPlayers[index] || ''}
                      onChange={(e) => handlePlayerSelect(e, index)}
                      disabled={isFormDisabled}
                      className='appearance-none block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-500'>
                      <option value=''>Select a player...</option>
                      {availablePlayers
                        .filter(
                          (p) =>
                            !selectedPlayers.includes(p.id) ||
                            selectedPlayers[index] === p.id
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3'>
                      <svg
                        className='h-5 w-5 text-gray-400'
                        viewBox='0 0 20 20'
                        fill='none'
                        stroke='currentColor'>
                        <path
                          d='M7 7l3-3 3 3m0 6l-3 3-3-3'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='flex justify-end space-x-4 pt-6 border-t border-gray-200'>
          <button
            type='button'
            onClick={onCancel}
            className='px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            disabled={isFormDisabled}>
            Cancel
          </button>
          <button
            type='submit'
            disabled={isSaving || isFormDisabled}
            className='px-6 py-3 text-base font-medium text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
            {isSaving
              ? isEditMode
                ? 'Saving...'
                : 'Creating...'
              : isEditMode
              ? 'Save Changes'
              : 'Create Team'}
          </button>
        </div>
      </form>
    </div>
  );
};
