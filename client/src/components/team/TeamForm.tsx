import React, { useState, useEffect } from 'react';
import type { Team } from '../../types/team';

import { useTeamApi } from '../../services/teamApi';
import { useTournament } from '../../contexts/TournamentContext';

import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

interface LabelProps {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  disabled?: boolean;
}

const Label: React.FC<LabelProps> = ({
  children,
  className = '',
  htmlFor,
  disabled = false,
}) => (
  <label
    className={`text-sm font-bold pr-1 ${
      disabled ? 'text-gray-400' : 'text-gray-700'
    } ${className} flex items-center gap-1`}
    htmlFor={htmlFor}>
    {children}

    {disabled && (
      <span className='text-xs text-gray-400'>
        {/* simple svg to indicate locked */}
        <svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
          <path
            fillRule='evenodd'
            d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z'
            clipRule='evenodd'
          />
        </svg>
      </span>
    )}
  </label>
);

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

  const teamApi = useTeamApi();
  const {
    players: availablePlayers,
    isLoading: isTournamentLoading,
    error: tournamentError,
    currentTournament,
  } = useTournament();

  const isEditingAllowed = (): boolean => {
    if (!currentTournament) return false;
    if (currentTournament.status === 'NOT_STARTED') return true;

    // If the tournament has started, only allow editing if the team
    // has not been updated since before the tournament starts, ie allow one edit
    // if (!currentTournament.startDate) return false;
    // if (!team?.updatedAt) return false;
    // return new Date(currentTournament.startDate) > new Date(team.updatedAt);

    return false;
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
      if (team) {
        const updatedTeam = await teamApi.updateTeam(team.id, {
          name: teamName,
          players: selectedPlayers,
          color: teamColor,
        });
        if (onSuccess) onSuccess(updatedTeam);
      } else {
        const newTeam = await teamApi.createTeam({
          name: teamName,
          players: selectedPlayers,
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

  const handlePlayerSelect = (
    e: React.ChangeEvent<HTMLSelectElement>,
    index: number
  ) => {
    const playerId = e.target.value;
    const newPlayers = [...selectedPlayers];
    newPlayers[index] = playerId;
    setSelectedPlayers(newPlayers);
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
        <form onSubmit={handleSubmit} className='space-y-8'>
          {/* Team Setup */}
          {showTeamInfo && (
            <div className='space-y-4'>
              {/* <h2 className='text-xl font-semibold text-gray-400 border-b border-gray-300'>
                TEAM INFO
              </h2> */}
              <div className='space-y-4'>
                <div>
                  <Label htmlFor='team-name'>TEAM NAME</Label>
                  <input
                    type='text'
                    id='team-name'
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    // disabled={Boolean(team && !isEditingAllowed())} always allow editing
                    className='mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed'
                    placeholder='Enter team name'
                  />
                </div>
                <div>
                  <Label htmlFor='team-color'>TEAM COLOR</Label>
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
                        className={`flex flex-col items-center 'cursor-pointer'`}>
                        <input
                          type='radio'
                          name='teamColor'
                          value={color}
                          checked={teamColor === color}
                          onChange={() => setTeamColor(color)}
                          // disabled={Boolean(team && !isEditingAllowed())} always allow editing
                          className='sr-only'
                        />
                        <span
                          className={`h-8 w-8 rounded-full border-4 ring-2 ring-white ${
                            teamColor === color
                              ? 'border-gray-900 border border-9'
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

          {/* Select Your Golfers */}
          {showPlayerSelect && (
            <div className='space-y-4'>
              {/* <h2 className='text-xl font-semibold text-gray-400 border-b border-gray-300'>
                TEAM ROSTER
              </h2> */}

              {/* Info warning that editing is not allowed */}

              {!isEditingAllowed() && (
                <>
                  <hr className='my-4' />
                  <div
                    className='bg-gray-50 text-gray-600 font-semibold px-3 py-2 rounded text-sm border border-orange-300'
                    role='alert'>
                    <span className='inline'>
                      ⚠️ Rosters cannot be edited while a tournament is in
                      progress.
                    </span>
                  </div>
                </>
              )}

              <div className='space-y-4'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className='space-y-2'>
                    <Label
                      htmlFor={`player-${index}`}
                      disabled={!isEditingAllowed()}>
                      GOLFER {index + 1}
                    </Label>
                    <div className='relative'>
                      <select
                        id={`player-${index}`}
                        value={selectedPlayers[index] || ''}
                        onChange={(e) => handlePlayerSelect(e, index)}
                        disabled={!isEditingAllowed()}
                        className='appearance-none block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed'>
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
          )}

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
