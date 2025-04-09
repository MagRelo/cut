import React, { useState, useEffect } from 'react';
import type { PGAPlayer, TeamUpdatePayload } from '../../schemas/team';
import type { Team } from '../../services/api';
import { api } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

interface TeamFormComponentProps {
  teamId?: string;
  leagueId?: string;
  onSuccess: (teamId: string, leagueId: string) => void;
  onCancel: () => void;
  initialTeam?: Team;
}

export const TeamFormComponent: React.FC<TeamFormComponentProps> = ({
  teamId,
  leagueId,
  onSuccess,
  onCancel,
  initialTeam,
}) => {
  const isEditMode = Boolean(teamId);

  const [teamName, setTeamName] = useState(initialTeam?.name || '');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(
    initialTeam?.players.map((p) => p.player.id) || []
  );
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
        };
        await api.updateTeam(teamId, updatePayload);
        onSuccess(teamId, team?.leagueId || '');
      } else if (leagueId) {
        const newTeam = await api.createTeam({
          name: teamName,
          leagueId,
          players: selectedPlayers,
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

      <form onSubmit={handleSubmit} className='space-y-8'>
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
                className='appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base'
                placeholder='Enter your team name'
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
            <div className='grid gap-6 mt-4'>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index}>
                  <label
                    htmlFor={`player-${index}`}
                    className='block text-sm font-medium text-gray-900 mb-2'>
                    Player {index + 1}
                  </label>
                  <select
                    id={`player-${index}`}
                    value={selectedPlayers[index] || ''}
                    onChange={(e) => handlePlayerSelect(e, index)}
                    className='block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm bg-white'>
                    <option value=''>Select a player...</option>
                    {availablePlayers
                      .filter(
                        (p) =>
                          !selectedPlayers.includes(p.id) ||
                          selectedPlayers[index] === p.id
                      )
                      .sort((a, b) =>
                        (a.lastName || '').localeCompare(b.lastName || '')
                      )
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.lastName}, {player.firstName}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='flex justify-end space-x-4 pt-6 border-t border-gray-200'>
          <button
            type='button'
            onClick={onCancel}
            className='px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors'>
            Cancel
          </button>
          <button
            type='submit'
            disabled={isSaving}
            className='px-6 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
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
