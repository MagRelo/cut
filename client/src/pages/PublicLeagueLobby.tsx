import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  publicLeagueApi,
  type PublicLeague,
  type Tournament,
} from '../services/publicLeagueApi';
import { PublicTeamFormComponent } from '../components/team/PublicTeamFormComponent';

export const PublicLeagueLobby: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<PublicLeague | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const userId = localStorage.getItem('publicUserGuid');

  const fetchLeague = async () => {
    if (!leagueId) return;

    try {
      const data = await publicLeagueApi.getLeague(leagueId);
      setLeague(data);
    } catch (err) {
      setError('Failed to load league details');
      console.error('Error fetching league:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('PublicLeagueLobby mounted with userId:', userId);
    fetchLeague();
  }, [leagueId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const formatVenue = (tournament: Tournament): string => {
    if (typeof tournament.venue === 'string') {
      return tournament.venue;
    }
    if (tournament.venue) {
      return tournament.venue.name || '';
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>Loading league details...</div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-red-600 text-center'>
          {error || 'League not found'}
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-4xl mx-auto space-y-6'>
        <div className='bg-white rounded-lg shadow'>
          <div className='p-6'>
            <div className='flex justify-between items-center mb-2'>
              <h1 className='text-3xl font-bold'>{league.name}</h1>
            </div>

            {/* Tournament Information */}
            {league.tournament && (
              <div className='relative overflow-hidden rounded-lg border border-gray-200'>
                {league.tournament.beautyImage ? (
                  <>
                    <div
                      className='absolute inset-0 bg-cover bg-center'
                      style={{
                        backgroundImage: `url(${league.tournament.beautyImage})`,
                      }}
                    />
                    <div className='absolute inset-0 bg-black/50' />
                  </>
                ) : (
                  <div className='absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700' />
                )}
                <div className='relative p-6 text-white'>
                  <div className='flex justify-between items-center'>
                    <p className='text-2xl font-bold tracking-tight'>
                      {league.tournament.name}
                    </p>
                  </div>
                  <div className='mt-2 space-y-2'>
                    {league.tournament.venue && (
                      <p className='text-white/90'>
                        {formatVenue(league.tournament)}
                      </p>
                    )}
                    <a
                      href='https://www.pgatour.com/leaderboard'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-block mt-2 text-white/90 hover:text-white text-sm font-medium border border-white/30 rounded px-3 py-1 hover:border-white/60 transition-colors'>
                      Leaderboard ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Other Teams Section */}
        <div className='bg-white rounded-lg shadow'>
          <div className='p-6'>
            <div className='space-y-4'>
              {league.teams.length === 0 ? (
                <div className='text-gray-500 text-center py-4'>
                  No teams yet. Create one to get started!
                </div>
              ) : (
                [...league.teams]
                  .sort((a, b) => {
                    const totalA = a.players.reduce(
                      (total, player) => total + (player.total || 0),
                      0
                    );
                    const totalB = b.players.reduce(
                      (total, player) => total + (player.total || 0),
                      0
                    );
                    return totalB - totalA; // Sort descending
                  })
                  .map((team) => {
                    const totalPoints = team.players.reduce(
                      (total, player) => total + (player.total || 0),
                      0
                    );

                    return (
                      <div
                        key={team.id}
                        className='border-b pb-4 last:border-b-0 last:pb-0'>
                        <div className='flex justify-between items-center'>
                          <div className='flex items-center gap-3'>
                            <div
                              className='w-4 h-4 rounded-full'
                              style={{ backgroundColor: team.color }}
                              title={`Team Color: ${team.color}`}
                            />
                            <h3 className='font-semibold text-gray-900'>
                              {team.name}
                            </h3>
                          </div>
                          <div className='text-gray-900 font-medium'>
                            {totalPoints} pts
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* My Team Section */}
        {league.teams.length < league.maxTeams &&
          leagueId &&
          (() => {
            const userTeam = league.teams.find(
              (team) => team.userId === userId
            );
            const isScheduled = league.tournament?.status === 'scheduled';

            // Case 1: No userId -> always show form
            if (!userId)
              return (
                <PublicTeamFormComponent
                  leagueId={leagueId}
                  onSuccess={fetchLeague}
                />
              );

            // Case 2: Has userId but no team -> show form
            if (!userTeam)
              return (
                <PublicTeamFormComponent
                  leagueId={leagueId}
                  onSuccess={fetchLeague}
                />
              );

            // Case 3: Has team and tournament is scheduled -> show form
            if (userTeam && isScheduled)
              return (
                <PublicTeamFormComponent
                  leagueId={leagueId}
                  onSuccess={fetchLeague}
                />
              );

            // Case 4: Has team but tournament in progress -> don't show form
            return null;
          })()}

        {/* Share Section */}
        <div className='bg-white rounded-lg shadow'>
          <div className='p-6'>
            <div className='flex flex-col items-center space-y-4'>
              <h2 className='text-lg font-semibold text-gray-900'>
                Share League
              </h2>
              <button
                onClick={handleShare}
                className='inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors'>
                {showCopied ? (
                  <>
                    <svg
                      className='w-4 h-4 mr-2 text-green-500'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className='w-4 h-4 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                      />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
              <div className='p-4 bg-white rounded-lg border border-gray-200'>
                <QRCodeSVG value={window.location.href} size={128} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
