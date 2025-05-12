import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePublicLeagueApi } from '../services/publicLeagueApi';
import type { Team } from '../services/api';

import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { PublicTeamFormComponent } from '../components/team/PublicTeamFormComponent';
import { Share } from '../components/common/Share';
import { PlayerTable } from '../components/player/PlayerRow';

export const PublicSingleTeam: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const publicLeagueApi = usePublicLeagueApi();

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
      </div>

      <hr className='my-8' />

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
