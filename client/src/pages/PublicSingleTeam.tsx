import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePublicLeagueApi } from '../services/publicLeagueApi';
import type { Team } from '../types/team';

import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { PublicTeamFormComponent } from '../components/team/PublicTeamFormComponent';
import { Share } from '../components/common/Share';
import { PlayerTable } from '../components/player/PlayerRow';
import { LeagueCard } from '../components/LeagueCard';

export const PublicSingleTeam: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
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

  const fetchTeam = async () => {
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
  };

  useEffect(() => {
    fetchTeam();
  }, [publicLeagueApi]);

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
      <div className='px-4 py-4'>
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
      <div className='px-4 py-4'>
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
    <div className='px-4 py-4'>
      <h2 className='text-3xl font-extrabold text-gray-500 mb-2 mt-2'>
        My Team
      </h2>

      <div className='bg-white rounded shadow relative px-6 pt-6'>
        <h2 className='text-lg font-semibold mb-2 flex items-center gap-2'>
          <div
            className='w-4 h-4 rounded-full'
            style={{ backgroundColor: team.color }}
          />
          {team.name}
          {/* Edit icon button */}
          <button
            className='ml-auto text-gray-400 hover:text-emerald-600 focus:outline-none text-sm'
            title='Edit Team'
            onClick={() => setIsEditing(true)}>
            Edit
          </button>
        </h2>
        <PlayerTable players={team.players} />

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

      <h2 className='text-3xl font-extrabold text-gray-500 mb-2 mt-6'>
        My Leagues
      </h2>

      {team.leagues.map((league) => (
        <LeagueCard key={league.id} league={league} />
      ))}

      {/* New button to navigate to public leagues */}
      <div className='max-w-2xl mx-auto mt-6 flex justify-center mb-6'>
        <button
          onClick={() => navigate('/public/leagues')}
          className='px-6 py-2 bg-emerald-600 text-white rounded-md shadow hover:bg-emerald-700 transition-colors duration-150 font-semibold'>
          View Leagues
        </button>
      </div>

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share url={window.location.href} title='Share' subtitle='' />
      </div>
    </div>
  );
};
