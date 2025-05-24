import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTeamApi } from '../services/teamApi';
import { useTournament } from '../contexts/TournamentContext';

import type { Team } from '../types/team';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { TeamForm } from '../components/team/TeamForm';
import { Share } from '../components/common/Share';
import { LeagueCard } from '../components/LeagueCard';
import { PlayerCard } from '../components/player/PlayerCard';
// import { UpgradeAnonymousUserForm } from '../components/UpgradeAnonymousUserForm';

export const PublicSingleTeam: React.FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  const teamApi = useTeamApi();
  const {
    currentTournament,
    isLoading: isTournamentLoading,
    error: tournamentError,
  } = useTournament();
  const { user } = useAuth();

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
      if (
        user &&
        !user.isAnonymous &&
        'teams' in user &&
        user.teams &&
        user.teams.length > 0
      ) {
        result = await teamApi.getTeam(user.teams[0].id);
      } else if (user) {
        result = await teamApi.getStandaloneTeam();
      }
      setTeam(result || null);
    } catch {
      setError('Failed to load team');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [user]);

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

  if (isLoading || isTournamentLoading) {
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
      <div className='flex items-center justify-between mb-2'>
        <h2 className='text-3xl font-extrabold text-gray-400 m-0'>My Team</h2>
      </div>
      {/* 
      <div className='mb-4'>
        <TeamForm
          onSuccess={handleSuccess}
          showTeamInfo={true}
          showPlayerSelect={false}
        />
      </div>

      <div className='flex items-center justify-between mb-2'>
        <h2 className='text-3xl font-extrabold text-gray-400 m-0'>My Lineup</h2>
      </div>
      <TeamForm
        onSuccess={handleSuccess}
        showTeamInfo={false}
        showPlayerSelect={true}
      /> */}

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
              {team.players
                .slice()
                .sort(
                  (a, b) =>
                    (b.total || 0) +
                    (b.cut || 0) +
                    (b.bonus || 0) -
                    ((a.total || 0) + (a.cut || 0) + (a.bonus || 0))
                )
                .map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    roundDisplay={currentTournament?.roundDisplay || '1'}
                  />
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
        {team?.leagues.map((league) => (
          <LeagueCard key={league.id} league={league} />
        ))}
      </div>

      <hr className='my-4' />

      {/* User Info */}
      {/* <div className='flex items-center justify-between mb-2'>
        <h2 className='text-3xl font-extrabold text-gray-400 m-0'>
          My Account
        </h2>
      </div>
      <p className='text-gray-700 mb-2'>
        <span className='font-semibold'>Status:</span>{' '}
        {user && !user.isAnonymous ? (
          <span className='text-emerald-600'>Verified ✓</span>
        ) : (
          <span className='text-amber-600'>Not Verified ⚠️</span>
        )}
      </p> */}

      {/* User verified */}
      {/* {user && !user.isAnonymous && (
        <div className='bg-white rounded-lg shadow-sm p-4 border border-gray-200'>
          <p className='text-gray-700'>
            <span className='font-semibold'>Email:</span>{' '}
            <span className='text-gray-700'>{user.email}</span>
          </p>
        </div>
      )} */}

      {/* User not verified or anonymous */}
      {/* {(!user || user.isAnonymous) && (
        <div className='bg-white rounded-lg shadow-sm px-6 pb-6 border border-gray-200'>
          <UpgradeAnonymousUserForm />
        </div>
      )} */}

      {/* <hr className='my-8' /> */}

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share url={window.location.href} title='Share the Cut' subtitle='' />
      </div>
    </div>
  );
};
