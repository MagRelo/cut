import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePublicLeagueApi } from '../services/publicLeagueApi';
import type { Team } from '../types/team';

import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { PublicTeamFormComponent } from '../components/team/PublicTeamFormComponent';
import { Share } from '../components/common/Share';
// import { PlayerTable } from '../components/player/PlayerTable';
import { LeagueCard } from '../components/LeagueCard';
import { PlayerCards } from '../components/player/PlayerCards';
import { Tournament } from 'types/league';

export const PublicSingleTeam: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const publicLeagueApi = usePublicLeagueApi();

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

  const isEditingAllowed = (): boolean => {
    if (tournament?.status !== 'NOT_STARTED') return false;
    if (!team?.updatedAt) return true;

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const lastUpdate = new Date(team.updatedAt);

    return lastUpdate < fiveDaysAgo;
  };

  const fetchTeam = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await publicLeagueApi.getStandaloneTeam();
      setTeam(result || null);
    } catch {
      setError('Failed to load team');
    } finally {
      setIsLoading(false);
    }
  }, [publicLeagueApi, setIsLoading, setError, setTeam]);

  const fetchTournament = useCallback(async () => {
    const result = await publicLeagueApi.getCurrentTournament();
    setTournament(result || null);
  }, [publicLeagueApi, setTournament]);

  useEffect(() => {
    fetchTeam();
    fetchTournament();
  }, []);

  // const calculateTeamScore = (team: Team) => {
  //   return team.players
  //     .filter((player: TeamPlayer) => player.active)
  //     .reduce(
  //       (sum: number, player: TeamPlayer) => sum + (player.total || 0),
  //       0
  //     );
  // };

  if (isLoading) {
    return (
      <div className='px-4 py-4'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className='px-4 py-4'>
        <ErrorMessage message={error} />
      </div>
    );
  }

  // If no team, show the form to create one
  if (!team) {
    return (
      <div className='px-4 py-2'>
        <div className='flex items-center justify-between mb-2 mt-2'>
          <h2 className='text-3xl font-extrabold text-gray-400 m-0'>My Team</h2>
        </div>
        <PublicTeamFormComponent
          editMode={true}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            fetchTeam();
          }}
        />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className='px-4 py-2'>
        <div className='flex items-center justify-between mb-2 mt-2'>
          <h2 className='text-3xl font-extrabold text-gray-400 m-0'>My Team</h2>
        </div>

        <PublicTeamFormComponent
          editMode={true}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            fetchTeam();
          }}
        />
      </div>
    );
  }

  return (
    <div className='px-4 py-2'>
      <div className='flex items-center justify-between mb-2 mt-2'>
        <h2 className='text-3xl font-extrabold text-gray-400 m-0'>My Team</h2>
      </div>
      <div className=''>
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
            onClick={() => setIsEditing(true)}
            disabled={!isEditingAllowed()}
            className={`px-3 py-1 text-xs rounded shadow font-semibold transition-colors duration-150 ${
              !isEditingAllowed()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}>
            Edit
          </button>

          {/* <span className='text-base font-semibold text-gray-900'>
            {calculateTeamScore(team)} pts
          </span> */}
        </h2>
        {/* <PlayerTable players={team.players} /> */}
        <PlayerCards
          players={team.players}
          roundDisplay={tournament?.roundDisplay || '1'}
        />

        {/* Last Update Time */}
        <div className='text-xs text-gray-400 text-center py-2 border-t border-gray-100 flex items-center justify-center gap-2'>
          <span>
            Last update: {formatUpdateTime(findMostRecentPlayerUpdate())}
          </span>
          <button
            onClick={fetchTeam}
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
        {team.leagues.map((league) => (
          <LeagueCard key={league.id} league={league} />
        ))}
      </div>

      <hr className='my-8' />

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share url={window.location.href} title='Share' subtitle='' />
      </div>
    </div>
  );
};
