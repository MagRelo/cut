import React, { useState, useEffect } from 'react';
import type { Team } from '../../types/team';

import { useTeamApi } from '../../services/teamApi';
import { useTournament } from '../../contexts/TournamentContext';

import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../util/ErrorMessage';
import { PlayerSelectionModal } from '../team/PlayerSelectionModal';
import { PlayerStats } from './PlayerSelectionStats';
import { Label } from '../common/Label';

interface PublicTeamFormProps {
  team?: Team | null;
  loading?: boolean;
  error?: string | null;
  onSuccess?: (team: Team) => void;
  onCancel?: () => void;
  showTeamInfo?: boolean;
  showPlayerSelect?: boolean;
}

export const TeamForm = ({
  team = null,
  loading = false,
  error = null,
  onSuccess,
  onCancel,
  showTeamInfo = true,
  showPlayerSelect = true,
}: PublicTeamFormProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [teamColor, setTeamColor] = useState('#059669');
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(
    null
  );

  const teamApi = useTeamApi();
  const {
    players: availablePlayers,
    isLoading: isTournamentLoading,
    error: tournamentError,
    currentTournament,
  } = useTournament();

  const isEditingAllowed = (): boolean => {
    const allowed =
      !currentTournament || currentTournament.status === 'NOT_STARTED';
    return allowed;
  };

  useEffect(() => {
    if (team) {
      setTeamName(team.name);
      setSelectedPlayers(team.players.map((p) => p.player.id));
      setTeamColor(team.color);
    } else {
      if (
        teamName !== '' ||
        selectedPlayers.length !== 0 ||
        teamColor !== '#059669'
      ) {
        setTeamName('');
        setSelectedPlayers([]);
        setTeamColor('#059669');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      setFormError('Please enter a team name');
      return;
    }

    if (selectedPlayers.length > 4) {
      setFormError('You can select at most 4 players');
      return;
    }

    // check if leagueId is provided as query param
    const leagueId = new URLSearchParams(window.location.search).get(
      'leagueId'
    );

    setIsSaving(true);
    setFormError(null);

    try {
      // Filter out empty strings from players array
      const filteredPlayers = selectedPlayers.filter(
        (playerId) => playerId !== ''
      );

      if (team) {
        const updatedTeam = await teamApi.updateTeam(team.id, {
          name: teamName,
          players: filteredPlayers,
          color: teamColor,
        });
        if (onSuccess) onSuccess(updatedTeam);
      } else {
        const newTeam = await teamApi.createTeam({
          name: teamName,
          players: filteredPlayers,
          color: teamColor,
          leagueId: leagueId || undefined,
        });
        if (onSuccess) onSuccess(newTeam);
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : `Failed to ${team ? 'update' : 'create'} team`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlayerSelect = (playerId: string | null) => {
    if (selectedPlayerIndex !== null) {
      const newSelectedPlayers = [...selectedPlayers];
      newSelectedPlayers[selectedPlayerIndex] = playerId || '';
      setSelectedPlayers(newSelectedPlayers);
    }
    setSelectedPlayerIndex(null);
  };

  if (loading || isTournamentLoading) {
    return <LoadingSpinner />;
  }

  if (error || tournamentError) {
    return (
      <ErrorMessage
        message={String(
          error || tournamentError?.message || 'An error occurred'
        )}
      />
    );
  }

  return (
    <div className='bg-white rounded shadow p-6'>
      <div className=''>
        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Team Setup */}
          {showTeamInfo && (
            <div className='space-y-4'>
              <div className='space-y-4'>
                <div>
                  <Label htmlFor='team-name'>TEAM NAME</Label>
                  <input
                    type='text'
                    id='team-name'
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className='mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed'
                    placeholder='Enter team name'
                  />
                </div>
                <div>
                  <Label htmlFor='team-color'>TEAM COLOR</Label>
                  <div className='mt-3 grid grid-cols-5 gap-3'>
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
                        className={`flex flex-col items-center 'cursor-pointer'`}>
                        <input
                          type='radio'
                          name='teamColor'
                          value={color}
                          checked={teamColor === color}
                          onChange={() => setTeamColor(color)}
                          className='sr-only'
                        />
                        <span
                          className={`h-8 w-8 rounded-full border-4 ${
                            teamColor === color
                              ? 'border-white ring-2 ring-gray-400'
                              : 'border-white'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <hr className='my-4' />

          {!isEditingAllowed() && (
            <>
              <div
                className='bg-gray-50 text-gray-600 font-semibold px-3 py-2 rounded text-sm border border-orange-300'
                role='alert'>
                <span className='inline'>
                  ⚠️ Rosters cannot be edited while a tournament is in progress.
                </span>
              </div>
            </>
          )}

          {/* Select Your Golfers */}
          {showPlayerSelect && (
            <div className='space-y-4'>
              <div className='space-y-4'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className='space-y-2'>
                    <Label
                      htmlFor={`player-${index}`}
                      disabled={!isEditingAllowed()}>
                      GOLFER {index + 1}
                    </Label>
                    <div className='relative'>
                      {selectedPlayers[index] ? (
                        <button
                          type='button'
                          onClick={() => {
                            if (isEditingAllowed()) {
                              setSelectedPlayerIndex(index);
                            }
                          }}
                          disabled={!isEditingAllowed()}
                          className='w-full px-3 py-2.5 text-left border border-gray-300 rounded-lg bg-white hover:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed'>
                          <PlayerStats
                            player={
                              availablePlayers.find(
                                (p) => p.id === selectedPlayers[index]
                              ) || availablePlayers[0]
                            }
                          />
                        </button>
                      ) : (
                        <button
                          type='button'
                          onClick={() => setSelectedPlayerIndex(index)}
                          disabled={!isEditingAllowed()}
                          className='w-full px-3 py-2.5 text-left border border-gray-300 rounded-lg bg-white hover:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed'>
                          Select a player...
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <PlayerSelectionModal
            isOpen={selectedPlayerIndex !== null}
            onClose={() => setSelectedPlayerIndex(null)}
            onSelect={handlePlayerSelect}
            availablePlayers={availablePlayers}
            selectedPlayers={selectedPlayers}
          />

          <div className='flex justify-end gap-3'>
            {onCancel && (
              <button
                type='button'
                onClick={onCancel}
                className='inline-flex justify-center rounded-lg border border-gray-300 bg-white py-1.5 px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'>
                Cancel
              </button>
            )}
            <button
              type='submit'
              disabled={isSaving}
              className='inline-flex justify-center rounded-lg border border-transparent bg-emerald-600 py-1.5 px-3 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'>
              {isSaving ? 'Saving...' : team ? 'Update Team' : 'Create Team'}
            </button>
          </div>

          {(formError || error) && (
            <ErrorMessage message={formError || error || ''} />
          )}
        </form>
      </div>
    </div>
  );
};
