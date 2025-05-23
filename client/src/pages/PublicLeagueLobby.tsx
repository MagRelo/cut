import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeagueApi } from '../services/leagueApi';
import { Share } from '../components/common/Share';
import { type PublicLeague } from '../types/league';
import { type Team, type TeamPlayer } from '../types/team';
import { TeamCard } from '../components/team/TeamCard';

import { Timeline } from '../components/Timeline';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface LeagueResponse extends PublicLeague {
  commissionerId: string;
}

export const PublicLeagueLobby: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<PublicLeague | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const userId = localStorage.getItem('publicUserGuid');
  const navigate = useNavigate();
  const leagueApi = useLeagueApi();

  const fetchLeague = async () => {
    if (!leagueId) return;

    try {
      const data = (await leagueApi.getLeague(leagueId)) as LeagueResponse;

      if (!data) {
        setError('League not found');
        return;
      }

      const leagueWithTeams: PublicLeague = {
        ...data,
        isPublic: data.isPublic ?? false,
        memberCount: data.memberCount ?? 0,
        teamCount: data.teamCount ?? 0,
        teams: data.teams ?? [],
        members: data.members ?? [],
        owner: data.owner ?? {
          id: data.commissionerId,
          name: 'League Owner',
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        },
      };
      setLeague(leagueWithTeams);
    } catch {
      setError('Failed to load league details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeague().catch(() => {
      setError('Failed to initialize league');
    });
  }, [leagueId]);

  const calculateTeamScore = (team: Team) => {
    return team.players
      .filter((player: TeamPlayer) => player.active)
      .reduce(
        (sum: number, player: TeamPlayer) =>
          sum + (player.total || 0) + (player.cut || 0) + (player.bonus || 0),
        0
      );
  };

  const findMostRecentPlayerUpdate = (): Date | null => {
    if (!league?.teams?.length) return null;

    let mostRecent: Date | null = null;
    league.teams.forEach((team: Team) => {
      team.players.forEach((player: TeamPlayer) => {
        const playerDate = new Date(player.updatedAt);
        if (!mostRecent || playerDate > mostRecent) {
          mostRecent = playerDate;
        }
      });
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

  const handleJoinLeague = async () => {
    if (!leagueId) return;

    setIsActionLoading(true);
    try {
      await leagueApi.joinLeague(leagueId);
      await fetchLeague();
    } catch {
      setError('Failed to join league');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeaveLeague = async () => {
    if (!leagueId) return;

    setIsActionLoading(true);
    try {
      await leagueApi.leaveLeague(leagueId);
      await fetchLeague();
    } catch {
      setError('Failed to leave league');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-red-600 text-center'>
          {error || 'League not found'}
        </div>

        <p className='text-center my-4'>Make sure you have created a team.</p>

        <div className='flex justify-center my-8'>
          <button
            onClick={() => navigate('/public/team')}
            className='bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
            My Team
          </button>
        </div>
      </div>
    );
  }

  const teams: Team[] = league.teams ?? [];
  const userHasTeam = teams.some((team) => team.userId === userId);

  return (
    <div className='px-4 py-4'>
      {/* Teams Section */}
      <div className=''>
        <div className='flex justify-between items-center mb-3'>
          <div className='flex items-center gap-4'>
            <h1 className='text-4xl font-extrabold tracking-tight text-gray-800'>
              {league.name}
            </h1>

            <button
              onClick={() => setIsTimelineOpen(!isTimelineOpen)}
              className='items-center justify-between border border-gray-200 rounded-md p-2 bg-gray-50'>
              <svg
                className={`w-5 h-5 transform transition-transform ${
                  isTimelineOpen ? 'rotate-180' : ''
                }`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 32 32'>
                {/* X and Y axes crossing at center */}
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  stroke='#9ca3af'
                  d='M4 16h24M16 4v24'
                />
                {/* Sine wave crossing through origin with increased amplitude */}
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={3.5}
                  stroke='#22c55e'
                  d='M0 16c4-12 12-12 16 0s12 12 16 0'
                />
              </svg>
            </button>
          </div>

          {/* join button */}
          {!userHasTeam && (
            <button
              onClick={handleJoinLeague}
              disabled={isActionLoading}
              className='bg-emerald-600 text-white px-3 py-1 text-sm rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
              Join
            </button>
          )}
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isTimelineOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
          <Timeline
            leagueId={leagueId || ''}
            tournamentId={league.tournament?.id || ''}
            tournamentStartDate={league.tournament?.startDate || ''}
            className='mb-4 border border-gray-200'
          />
        </div>

        <div>
          <div className='space-y-4'>
            {teams.length === 0 ? (
              <div className='text-gray-500 text-center py-3'>
                No teams yet. Create one to get started!
              </div>
            ) : (
              [...teams]
                .sort(
                  (a: Team, b: Team) =>
                    calculateTeamScore(b) - calculateTeamScore(a)
                )
                .map((team: Team) => (
                  <div key={team.id} className='mb-4'>
                    <TeamCard
                      key={team.id}
                      team={team}
                      roundDisplay={league.tournament?.roundDisplay}
                    />
                  </div>
                ))
            )}
          </div>
          {/* Last Update Time */}
          <div className='text-xs text-gray-400 text-center py-3 border-t border-gray-100 flex items-center justify-center gap-2'>
            <span>
              Last update: {formatUpdateTime(findMostRecentPlayerUpdate())}
            </span>
            <button
              onClick={fetchLeague}
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
      </div>

      {/* Leave League Buttons */}
      <div className='flex justify-center my-8'>
        {userHasTeam ? (
          <button
            onClick={handleLeaveLeague}
            disabled={isActionLoading}
            className='bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 hover:text-red-600 transition-colors disabled:opacity-50 text-sm disabled:cursor-not-allowed border border-gray-200'>
            {isActionLoading ? 'Leaving...' : 'Leave League'}
          </button>
        ) : null}

        <hr className='border-t border-gray-200 ' />
      </div>

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share
          url={`${
            import.meta.env.VITE_BASE_URL || window.location.origin
          }/public/team?leagueId=${leagueId}`}
          title={'Invite to ' + league.name}
          subtitle=''
        />
      </div>
    </div>
  );
};
