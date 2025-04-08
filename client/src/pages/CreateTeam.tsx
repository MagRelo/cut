import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { PGAPlayer } from '../schemas/team';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';

export const CreateTeam: React.FC = () => {
  const navigate = useNavigate();
  const { leagueId } = useParams<{ leagueId: string }>();
  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<PGAPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setIsLoading(true);
        const players = await api.getPGATourPlayers();
        setAvailablePlayers(players);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch players'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueId) return;

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
      await api.createTeam({
        name: teamName,
        leagueId,
        players: selectedPlayers,
      });
      navigate(`/league-lobby/${leagueId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
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

  return (
    <div className='px-4 py-6'>
      <div className='max-w-2xl mx-auto'>
        <h1 className='text-2xl font-bold text-gray-900 mb-6'>
          Create Your Team
        </h1>

        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit} className='space-y-6'>
          <div>
            <label
              htmlFor='teamName'
              className='block text-sm font-medium text-gray-700'>
              Team Name
            </label>
            <input
              type='text'
              id='teamName'
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
              placeholder='Enter team name'
            />
          </div>

          <div>
            <h2 className='text-lg font-medium text-gray-900 mb-4'>
              Select 4 Players
            </h2>
            <div className='space-y-4'>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index}>
                  <label
                    htmlFor={`player-${index}`}
                    className='block text-sm font-medium text-gray-700'>
                    Player {index + 1}
                  </label>
                  <select
                    id={`player-${index}`}
                    value={selectedPlayers[index] || ''}
                    onChange={(e) => handlePlayerSelect(e, index)}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'>
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

          <div className='flex justify-end space-x-3'>
            <button
              type='button'
              onClick={() => navigate(`/league-lobby/${leagueId}`)}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'>
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSaving}
              className='px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'>
              {isSaving ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeam;
