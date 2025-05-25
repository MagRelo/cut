import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeagueApi } from '../services/leagueApi';
import { LeagueCard } from '../components/LeagueCard';
import { type League } from '../types/league';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

export const PublicLeagueList: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const leagueApi = useLeagueApi();
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const data = await leagueApi.getLeagues();
        setLeagues(data);
      } catch (err) {
        setError('Failed to load leagues');
        console.error('Error fetching leagues:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeagues();
  }, []);

  // Filter leagues where user owns a team
  const ownedLeagues = leagues.filter((league) =>
    league.leagueTeams?.some(
      (leagueTeam) => leagueTeam.team.owner.id === user?.id
    )
  );
  // Filter leagues where user doesn't own a team
  const otherLeagues = leagues.filter(
    (league) =>
      !league.leagueTeams?.some(
        (leagueTeam) => leagueTeam.team.owner.id === user?.id
      )
  );

  return (
    <div className='container mx-auto'>
      {isLoading ? (
        <div className='text-center py-4'>
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className='text-red-600 text-center py-4'>{error}</div>
      ) : (
        <div className='max-w-2xl mx-auto p-4'>
          {/* My Leagues */}
          {ownedLeagues.length > 0 && (
            <>
              <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0'>
                <h1 className='text-3xl font-bold text-gray-400'>My Leagues</h1>
              </div>
              {/* League List Section */}
              <div className='space-y-2 mb-10'>
                <div className='space-y-2'>
                  {ownedLeagues.map((league) => (
                    <LeagueCard key={league.id} league={league} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Header Section */}
          <div className='flex justify-between items-center mb-4'>
            <h1 className='text-3xl font-bold text-gray-400'>All Leagues</h1>
            <Link
              to='/public/leagues/new'
              className='text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded text-xs transition-colors duration-150 inline-flex items-center gap-1'>
              <span className='text-xs font-medium'>New</span>
            </Link>
          </div>

          {/* League List Section */}
          <div className='space-y-2 mb-20'>
            {otherLeagues.length === 0 ? (
              <div className='text-gray-500 text-center py-4'>
                No other leagues found.
              </div>
            ) : (
              <div className='space-y-2'>
                {[...otherLeagues]
                  .sort(
                    (a, b) =>
                      (b.leagueTeams?.length ?? 0) -
                      (a.leagueTeams?.length ?? 0)
                  )
                  .map((league) => (
                    <LeagueCard key={league.id} league={league} />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
