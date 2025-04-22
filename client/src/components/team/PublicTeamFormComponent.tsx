import React, { useState, useEffect } from 'react';
import type { PGAPlayer } from '../../schemas/team';
import type { Team } from '../../services/api';
import { api } from '../../services/api';
import { publicLeagueApi } from '../../services/publicLeagueApi';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

interface PublicTeamFormProps {
  leagueId: string;
  onSuccess?: () => void;
}

export const PublicTeamFormComponent: React.FC<PublicTeamFormProps> = ({
  leagueId,
  onSuccess,
}) => {
  const userId = localStorage.getItem('publicUserGuid');
  const [isEditing, setIsEditing] = useState(false);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [teamColor, setTeamColor] = useState('#059669');
  const [availablePlayers, setAvailablePlayers] = useState<PGAPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [players, league] = await Promise.all([
          api.getPGATourPlayers(),
          publicLeagueApi.getLeague(leagueId),
        ]);

        setAvailablePlayers(players);

        // Find my team in the league
        const team = league.teams.find((t) => t.userId === userId);
        if (team) {
          setMyTeam(team);
          setTeamName(team.name);
          setSelectedPlayers(team.players.map((p) => p.player.id));
          setTeamColor(team.color);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    console.log('userId', userId);

    fetchData();
  }, [leagueId, userId]);

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

    // if (!userId) {
    //   setError('User ID is required');
    //   return;
    // }

    setIsSaving(true);
    setError(null);

    try {
      if (myTeam) {
        await publicLeagueApi.updateTeam(leagueId, myTeam.id, {
          name: teamName,
          players: selectedPlayers,
          color: teamColor,
        });
      } else {
        await publicLeagueApi.createTeam(leagueId, {
          name: teamName,
          players: selectedPlayers,
          color: teamColor,
        });
      }

      // Refresh the league data
      const updatedLeague = await publicLeagueApi.getLeague(leagueId);
      const updatedTeam = updatedLeague.teams.find((t) => t.userId === userId);
      setMyTeam(updatedTeam || null);
      setIsEditing(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${myTeam ? 'update' : 'create'} team`
      );
    } finally {
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

  if (!isEditing && myTeam) {
    return (
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-xl font-semibold'>My Team</h2>
          <button
            onClick={() => setIsEditing(true)}
            className='text-blue-600 hover:text-blue-800'>
            Edit Team
          </button>
        </div>
        <div className='space-y-4'>
          <div>
            <h3
              className='font-semibold text-lg'
              style={{ color: myTeam.color }}>
              {myTeam.name}
            </h3>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            {myTeam.players.map((teamPlayer) => (
              <div
                key={teamPlayer.player.id}
                className='p-3 bg-gray-50 rounded-lg'>
                <div className='font-medium'>{teamPlayer.player.name}</div>
                <div className='text-sm text-gray-500'>
                  {teamPlayer.active ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <div className='space-y-8'>
        <div className='flex justify-between items-center'>
          <h2 className='text-xl font-semibold'>
            {myTeam ? 'Edit Team' : 'Create Your Team'}
          </h2>
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className='text-gray-600 hover:text-gray-800'>
              Cancel
            </button>
          )}
        </div>

        {error && <ErrorMessage message={error} />}

        {isSaving && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white p-8 rounded-lg shadow-xl flex flex-col items-center space-y-4'>
              <LoadingSpinner />
              <p className='text-lg text-gray-700'>
                {myTeam ? 'Updating' : 'Creating'} team & calculating player
                scores...
              </p>
            </div>
          </div>
        )}

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
                  className='appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-base'
                  placeholder='Enter your team name'
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
                  className='h-10 w-20 rounded border border-gray-300 p-1'
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
                  className='appearance-none w-32 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono'
                  placeholder='#000000'
                  maxLength={7}
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
                        className='appearance-none block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'>
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
              type='submit'
              disabled={isSaving}
              className='px-6 py-3 text-base font-medium text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
              {isSaving
                ? myTeam
                  ? 'Saving...'
                  : 'Creating...'
                : myTeam
                ? 'Save Changes'
                : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
