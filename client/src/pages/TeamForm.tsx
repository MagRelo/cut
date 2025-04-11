import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TeamFormComponent } from '../components/team/TeamFormComponent';

export const TeamForm: React.FC = () => {
  const navigate = useNavigate();
  const { teamId, leagueId } = useParams<{
    teamId?: string;
    leagueId?: string;
  }>();

  const handleSuccess = (_: string, leagueId: string) => {
    navigate(`/league-lobby/${leagueId}`);
  };

  const handleCancel = () => {
    if (teamId) {
      // If we're editing, we need to get the leagueId from the API response
      navigate(-1);
    } else if (leagueId) {
      // If we're creating, we already have the leagueId
      navigate(`/league-lobby/${leagueId}`);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8'>
        <TeamFormComponent
          teamId={teamId}
          leagueId={leagueId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default TeamForm;
