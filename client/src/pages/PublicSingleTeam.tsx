import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTeamApi } from '../services/teamApi';
import { useTournament } from '../contexts/TournamentContext';

import type { Team } from '../types/team';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/util/ErrorMessage';
import { TeamForm } from '../components/team/TeamForm';
import { Share } from '../components/common/Share';
import { LeagueCard } from '../components/LeagueCard';
import { PlayerCard } from '../components/player/PlayerCard';
import { PlayerStats } from '../components/team/PlayerStats';
import { PlayerSelectionModal } from '../components/team/PlayerSelectionModal';
import { PageHeader } from '../components/util/PageHeader';
// import { UserRegisterForm } from '../components/UserRegisterForm';

export const PublicSingleTeam: React.FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const teamApi = useTeamApi();
  const {
    currentTournament,
    isLoading: isTournamentLoading,
    error: tournamentError,
    players: availablePlayers,
  } = useTournament();
  const { user, loading: isAuthLoading } = useAuth();

  const findMostRecentPlayerUpdate = (): Date | null => {
    if (!team?.players?.length) return null;

    let mostRecent: Date | null = null;
    team.players.forEach((player) => {
      const playerDate = new Date(player.updatedAt);
      if (!mostRecent || playerDate > mostRecent) {
        mostRecent = playerDate;
      }
    });
    return mostRecent;
  };

  const formatUpdateTime = (date: Date | null): string => {
    if (!date) return 'No updates yet';

    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${month}/${day} ${displayHours}:${minutes} ${ampm}`;
  };

  const fetchTeam = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let result = null;
      result = await teamApi.getStandaloneTeam();
      setTeam(result || null);
    } catch {
      setError('Failed to load team');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      fetchTeam();
    }
  }, [user, isAuthLoading]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSuccess = async () => {
    setIsEditing(false);
    await fetchTeam();
  };

  const handlePlayerSelect = async (playerId: string | null) => {
    if (selectedPlayerIndex === null || !team) return;

    // Close modal immediately
    setSelectedPlayerIndex(null);
    setIsSaving(true);
    try {
      const updatedPlayers = [
        ...(team?.players?.map((p) => p.player.id) || []),
      ];
      updatedPlayers[selectedPlayerIndex] = playerId || '';

      // Filter out empty strings before sending to API
      const validPlayers = updatedPlayers.filter((id) => id !== '');

      await teamApi.updateTeam(team.id, {
        name: team.name,
        players: validPlayers,
        color: team.color,
      });

      // Fetch the updated team to get the full TeamPlayer structure
      const updatedTeam = await teamApi.getStandaloneTeam();
      setTeam(updatedTeam);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to update player'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isEditingAllowed = (): boolean => {
    // return true;
    return !currentTournament || currentTournament.status === 'NOT_STARTED';
  };

  if (isLoading || isTournamentLoading || isAuthLoading) {
    return (
      <div className='px-4 py-4'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || tournamentError) {
    return (
      <div className='px-4 py-4'>
        <ErrorMessage
          message={error || tournamentError?.message || 'An error occurred'}
        />
      </div>
    );
  }

  return (
    <div className='p-4'>
      {/* Team Info */}
      <PageHeader title='My Team' />

      {/* Team Section */}
      <div className=''>
        {!team ? (
          // Create Mode
          <TeamForm onSuccess={handleSuccess} />
        ) : isEditing ? (
          // Edit Mode
          <TeamForm
            team={team}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            showTeamInfo={true}
            showPlayerSelect={false}
          />
        ) : (
          // Display Mode
          <div className=''>
            {/* Team Name and Edit Button */}
            <h2 className='text-lg font-semibold mb-2 flex items-center gap-3'>
              <div className='flex items-center gap-2 flex-1 min-w-0'>
                <div
                  className='w-4 h-4 rounded-full flex-shrink-0'
                  style={{ backgroundColor: team.color }}
                />
                <span
                  className='text-2xl font-bold relative overflow-hidden whitespace-nowrap pr-6 block flex-1 min-w-0'
                  style={{ display: 'block' }}>
                  {team.name}
                  <span
                    className='pointer-events-none absolute right-0 top-0 h-full w-10'
                    style={{
                      background:
                        'linear-gradient(to left, rgb(243 244 246) 70%, transparent 100%)',
                    }}
                  />
                </span>
              </div>

              <button
                onClick={handleEdit}
                className='px-3 py-1 text-xs rounded shadow font-semibold transition-colors duration-150 bg-emerald-600 text-white hover:bg-emerald-700'>
                Edit
              </button>
            </h2>

            {/* Player cards */}
            <div className='grid grid-cols-1 gap-3'>
              {currentTournament?.status === 'NOT_STARTED'
                ? // Show 4 slots in NOT_STARTED mode
                  Array.from({ length: 4 }).map((_, index) => {
                    const player = team?.players?.[index];
                    return (
                      <div key={index}>
                        <div
                          className='bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow relative'
                          onClick={() => {
                            if (isEditingAllowed()) {
                              setSelectedPlayerIndex(index);
                            }
                          }}>
                          {isEditingAllowed() && (
                            <div className='absolute top-2 right-2 bg-emerald-100 text-emerald-600 p-1.5 rounded-md'>
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                className='h-5 w-5'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'>
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                                />
                              </svg>
                            </div>
                          )}
                          <PlayerStats player={player?.player} />
                          {isSaving && selectedPlayerIndex === index && (
                            <div className='mt-2 text-sm text-gray-500'>
                              Saving...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                : // Just map through existing players in other modes
                  team?.players?.map((player) => (
                    <div key={player.id}>
                      <PlayerCard
                        player={player}
                        roundDisplay={currentTournament?.roundDisplay || '1'}
                      />
                    </div>
                  ))}
            </div>

            {/* Last Update Time */}
            <div className='text-xs text-gray-400 text-center py-3 border-t border-gray-100 flex items-center justify-center gap-2'>
              <span>
                Last update: {formatUpdateTime(findMostRecentPlayerUpdate())}
              </span>
              <button
                onClick={() => {
                  setIsLoading(true);
                  setError(null);
                  if (
                    user &&
                    !user.isAnonymous &&
                    'teams' in user &&
                    user.teams &&
                    user.teams.length > 0
                  ) {
                    teamApi
                      .getTeam(user.teams[0].id)
                      .then((result) => {
                        setTeam(result || null);
                        setIsLoading(false);
                      })
                      .catch(() => {
                        setError('Failed to refresh team');
                        setIsLoading(false);
                      });
                  } else if (user) {
                    teamApi
                      .getStandaloneTeam()
                      .then((result) => {
                        setTeam(result || null);
                        setIsLoading(false);
                      })
                      .catch(() => {
                        setError('Failed to refresh team');
                        setIsLoading(false);
                      });
                  }
                }}
                className='p-1 hover:bg-gray-100 rounded-full transition-colors'
                title='Refresh data'>
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <hr className='my-4' />

      {/* Leagues */}
      <div className='flex items-center justify-between mb-2 mt-6'>
        <h2 className='text-3xl font-extrabold text-gray-400 m-0'>
          My Leagues
        </h2>
        <button
          onClick={() => navigate('/public/leagues')}
          className='px-3 py-1 text-xs bg-emerald-600 text-white rounded shadow hover:bg-emerald-700 transition-colors duration-150 font-semibold'>
          View All
        </button>
      </div>
      <div className='space-y-2'>
        {team?.leagues?.map((league) => (
          <LeagueCard key={league.id} league={league} />
        ))}
      </div>

      <hr className='my-4' />

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share url={window.location.href} title='Share the Cut' subtitle='' />
      </div>

      <PlayerSelectionModal
        isOpen={selectedPlayerIndex !== null}
        onClose={() => setSelectedPlayerIndex(null)}
        onSelect={handlePlayerSelect}
        availablePlayers={availablePlayers || []}
        selectedPlayers={team?.players?.map((p) => p.player.id) || []}
      />
    </div>
  );
};
