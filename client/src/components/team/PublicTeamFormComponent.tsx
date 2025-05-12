import React, { useEffect, useState } from 'react';
import type { PGAPlayer } from '../../schemas/team';
import type { Team } from '../../types/team';
import { api } from '../../services/api';
import { usePublicLeagueApi } from '../../services/publicLeagueApi';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

interface PublicTeamFormProps {
  onSuccess?: () => void;
  editMode?: boolean;
  onCancel?: () => void;
}

export const PublicTeamFormComponent = ({
  onSuccess,
  editMode = false,
  onCancel,
}: PublicTeamFormProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(editMode);

  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [teamColor, setTeamColor] = useState('#059669');
  const [availablePlayers, setAvailablePlayers] = useState<PGAPlayer[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);

  const publicLeagueApi = usePublicLeagueApi();

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isMounted) return;

      try {
        setIsLoading(true);
        const [players, team] = await Promise.all([
          api.getPGATourPlayers(),
          publicLeagueApi.getStandaloneTeam(),
        ]);

        if (!isMounted) return;

        setAvailablePlayers(players);
        if (team) {
          setMyTeam(team);
          setTeamName(team.name);
          setSelectedPlayers(team.players.map((p) => p.player.id));
          setTeamColor(team.color);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [publicLeagueApi]);

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

    setIsSaving(true);
    setError(null);

    try {
      if (myTeam) {
        await publicLeagueApi.updateStandaloneTeam(myTeam.id, {
          name: teamName,
          players: selectedPlayers,
          color: teamColor,
        });
      } else {
        await publicLeagueApi.createStandaloneTeam({
          name: teamName,
          players: selectedPlayers,
          color: teamColor,
        });
      }

      const updatedTeam = await publicLeagueApi.getStandaloneTeam();
      if (updatedTeam) {
        setMyTeam(updatedTeam);
        setIsEditing(false);
        if (onSuccess) onSuccess();
      }
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
    const newPlayers = [...selectedPlayers];
    newPlayers[index] = playerId;
    setSelectedPlayers(newPlayers);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isEditing && myTeam && Array.isArray(myTeam.players)) {
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
                <div className='font-medium'>
                  {teamPlayer.player.displayName}
                </div>
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
    <div className='bg-white rounded shadow p-6'>
      <div className=''>
        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit} className='space-y-8'>
          <div className='space-y-6'>
            <div className='space-y-4'>
              <h2 className='text-xl font-semibold text-gray-900'>
                {isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      if (onCancel) onCancel();
                    }}
                    className='float-right text-gray-400 focus:outline-none text-sm'>
                    cancel
                  </button>
                )}
                Select Your Golfers
              </h2>
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
                          .sort(
                            (a, b) =>
                              (a.pga_lastName || '').localeCompare(
                                b.pga_lastName || ''
                              ) || 0
                          )
                          .map((player) => (
                            <option key={player.id} value={player.id}>
                              {`${player.pga_lastName || ''}, ${
                                player.pga_firstName || ''
                              }`}
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
            <h2 className='text-xl font-semibold text-gray-900'>
              Setup Your Team
            </h2>
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
                  className='appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-base'
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
              <div className='mt-2 grid grid-cols-5 gap-3'>
                {[
                  '#0a73eb',
                  '#A3A3A3',
                  '#FF48BF',
                  '#F58300',
                  '#00ABB8',
                  '#FFD60A',
                  '#E00000',
                  '#4700E0',
                  '#9600CC',
                  '#00B86B',
                ].map((color) => (
                  <label
                    key={color}
                    className='flex flex-col items-center cursor-pointer'>
                    <input
                      type='radio'
                      name='teamColor'
                      value={color}
                      checked={teamColor === color}
                      onChange={() => setTeamColor(color)}
                      className='sr-only'
                    />
                    <span
                      className={`h-8 w-8 rounded-full border-2 ${
                        teamColor === color
                          ? 'border-emerald-500 border-4 ring-emerald-400/50 ring-2'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className='flex justify-end space-x-4 pt-6 border-t border-gray-200'>
            <button
              type='submit'
              disabled={isSaving}
              className='px-6 py-2 bg-emerald-600 text-white rounded-md shadow hover:bg-emerald-700 transition-colors duration-150 font-semibold'>
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
