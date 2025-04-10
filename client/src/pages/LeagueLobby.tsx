import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { Team } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { TeamFormComponent } from '../components/team/TeamFormComponent';
import { LeagueChat } from '../components/LeagueChat';

interface League {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  maxTeams: number;
  isPrivate: boolean;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    joinedAt: string;
  }>;
}

interface Tournament {
  id: string;
  name: string;
  location: string;
  course: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  startDate: string;
  endDate: string;
}

interface TournamentOdds {
  [key: string]: Array<{
    name: string;
    price: number;
  }>;
}

type TabSection =
  | 'chat'
  | 'teams'
  | 'createTeam'
  | 'liveBets'
  | 'leagueSettings';
type RightColumnTab = TabSection;

export const LeagueLobby: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Team[]>([]);
  const [league, setLeague] = useState<League | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentOdds, setTournamentOdds] = useState<TournamentOdds | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState<TabSection>('teams');
  const [rightColumnTab, setRightColumnTab] = useState<RightColumnTab>('teams');

  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    const fetchLeagueData = async () => {
      if (!leagueId) {
        setError('No league ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch league details, teams, and tournament data in parallel
        const [leagueData, teamsData, tournamentData] = await Promise.all([
          api.getLeague(leagueId),
          api.getTeamsByLeague(leagueId),
          api.getCurrentTournament(),
        ]);

        setLeague(leagueData);
        setTeams(teamsData);
        setTournament(tournamentData);

        // Check if user is a member of this league by checking the members array
        const userId = localStorage.getItem('userId');
        const isMemberOfLeague = leagueData.members.some(
          (member) => member.userId === userId
        );
        setIsMember(isMemberOfLeague);

        // Find user's team if they have one
        if (isMemberOfLeague) {
          const userTeam = teamsData.find(
            (team) => team.userId === localStorage.getItem('userId')
          );
          setUserTeam(userTeam || null);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch league data'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeagueData();
  }, [leagueId]);

  useEffect(() => {
    const fetchOdds = async () => {
      try {
        const odds = await api.getTournamentOdds(
          'golf_masters_tournament_winner',
          ['draftkings']
        );
        setTournamentOdds(odds);
      } catch (error) {
        console.error('Error fetching tournament odds:', error);
      }
    };

    fetchOdds();
  }, []);

  const handleLeaveLeague = async () => {
    if (!leagueId) return;

    setIsActionLoading(true);
    try {
      await api.leaveLeague(leagueId);
      // Navigate back to leagues list after leaving
      window.location.href = '/leagues';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave league');
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const calculateTeamScore = (team: Team) => {
    return team.players
      .filter((player) => player.active)
      .reduce((sum, player) => sum + (player.total || 0), 0);
  };

  const renderOddsList = () => {
    if (!tournamentOdds?.draftkings) {
      return <p className='text-gray-500'>Loading odds...</p>;
    }

    return (
      <div className='overflow-hidden'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th
                scope='col'
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Player
              </th>
              <th
                scope='col'
                className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Odds
              </th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            {tournamentOdds.draftkings
              .sort((a, b) => a.price - b.price) // Sort by odds (lowest to highest)
              .map((outcome, index) => (
                <tr
                  key={outcome.name}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                    {outcome.name}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500'>
                    {outcome.price > 0 ? `+${outcome.price}` : outcome.price}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderLiveBetsContent = () => (
    <div className='space-y-8'>
      <div>
        <h2 className='text-lg font-semibold mb-4'>
          Tournament Odds (DraftKings)
        </h2>
        {renderOddsList()}
      </div>
      <div>
        <h2 className='text-lg font-semibold mb-4'>Place New Bet</h2>
        {/* Bet form will go here */}
        <p className='text-gray-500'>Bet form coming soon...</p>
      </div>
      <div>
        <h2 className='text-lg font-semibold mb-4'>Your Open Bets</h2>
        {/* Open bets list will go here */}
        <p className='text-gray-500'>Open bets coming soon...</p>
      </div>
    </div>
  );

  const renderChatContent = () => {
    if (!leagueId || !isMember) {
      return (
        <div className='p-4 text-center text-gray-500'>
          You must be a member of this league to participate in chat.
        </div>
      );
    }

    return <LeagueChat leagueId={leagueId} />;
  };

  if (isLoading) {
    return (
      <div className='px-4 py-6'>
        <div className='text-center text-gray-600'>Loading league data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='px-4 py-6'>
        <div className='text-center text-red-600'>{error}</div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className='px-4 py-6'>
        <div className='text-center text-red-600'>League not found</div>
      </div>
    );
  }

  const renderMobileNavigation = () => (
    <div className='lg:hidden border-b border-gray-200 mb-4'>
      <nav className='flex space-x-4 px-4 overflow-x-auto'>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'chat'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}>
          Chat
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'teams'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}>
          Teams
        </button>
        {isMember && (
          <button
            onClick={() => setActiveTab('createTeam')}
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === 'createTeam'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            Manage Team
          </button>
        )}
        <button
          onClick={() => setActiveTab('liveBets')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'liveBets'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}>
          Live Bets
        </button>
        {isMember && (
          <button
            onClick={() => setActiveTab('leagueSettings')}
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === 'leagueSettings'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            League Settings
          </button>
        )}
      </nav>
    </div>
  );

  return (
    <div className='h-[calc(100vh-64px)] bg-gray-50 overflow-hidden'>
      <div className='max-w-7xl mx-auto h-full p-4'>
        {isDesktop ? (
          <div className='h-full grid grid-rows-[auto,1fr] bg-white rounded-lg overflow-hidden border border-gray-200'>
            {/* Desktop layout content */}
            {/* Top Section */}
            <div className='grid grid-cols-5'>
              {/* League Info - Takes up 3 columns */}
              <div className='col-span-3 p-6'>
                <div>
                  <h1 className='text-2xl font-bold text-gray-900'>
                    {league.name}
                  </h1>
                  {league.description && (
                    <p className='mt-2 text-gray-600'>{league.description}</p>
                  )}
                </div>
              </div>

              {/* Tournament Info - Takes up 2 columns */}
              <div className='col-span-2 p-6 border-l border-gray-200'>
                {tournament ? (
                  <>
                    <h2 className='text-lg font-semibold text-gray-900'>
                      {tournament.name}
                    </h2>
                    <div className='mt-2 space-y-1 text-sm text-gray-600'>
                      <p>{tournament.location}</p>
                      <p>{tournament.course}</p>
                      <p className='capitalize'>
                        {tournament.status.replace('-', ' ')}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className='text-gray-500'>No tournament scheduled</p>
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className='grid grid-cols-5 border-t border-gray-200 h-full overflow-hidden'>
              {/* Left Column: Chat (3/5 width) */}
              <div className='col-span-3 h-full overflow-hidden'>
                <div className='h-full'>{renderChatContent()}</div>
              </div>

              {/* Right Column: Teams, Create Team, Live Bets (2/5 width) */}
              <div className='col-span-2 flex flex-col overflow-hidden border-l border-gray-200'>
                {/* Tabs Navigation */}
                <div className='bg-white rounded-lg shadow flex flex-col h-full overflow-hidden'>
                  <div className='border-b border-gray-200 flex-shrink-0'>
                    <nav className='flex space-x-4 px-4' aria-label='Tabs'>
                      <button
                        onClick={() => setRightColumnTab('teams')}
                        className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                          rightColumnTab === 'teams'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}>
                        Teams
                      </button>
                      {isMember && (
                        <button
                          onClick={() => setRightColumnTab('createTeam')}
                          className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                            rightColumnTab === 'createTeam'
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}>
                          Manage Team
                        </button>
                      )}
                      <button
                        onClick={() => setRightColumnTab('liveBets')}
                        className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                          rightColumnTab === 'liveBets'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}>
                        Live Bets
                      </button>
                      {isMember && (
                        <button
                          onClick={() => setRightColumnTab('leagueSettings')}
                          className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                            rightColumnTab === 'leagueSettings'
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}>
                          League Settings
                        </button>
                      )}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className='p-4 flex-1 overflow-y-auto'>
                    {rightColumnTab === 'teams' && (
                      <div className='h-full overflow-y-auto'>
                        <div className='space-y-0'>
                          {teams.map((team, index) => (
                            <div
                              key={team.id}
                              className={`${
                                index === 0 ? 'border-t' : ''
                              } border-b border-gray-200`}>
                              <div className='w-full px-2 py-1.5 flex justify-between items-center'>
                                <button
                                  onClick={() => toggleTeam(team.id)}
                                  className='flex-1 flex justify-between items-center hover:bg-gray-100/50 transition-colors'>
                                  <h3 className='text-base font-medium text-gray-700'>
                                    {team.name}
                                  </h3>
                                  <div className='flex items-center space-x-2'>
                                    <span className='text-sm font-medium text-gray-600'>
                                      Score: {calculateTeamScore(team)}
                                    </span>
                                    <svg
                                      className={`w-4 h-4 text-gray-400 transform transition-transform ${
                                        expandedTeams.has(team.id)
                                          ? 'rotate-180'
                                          : ''
                                      }`}
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'>
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M19 9l-7 7-7-7'
                                      />
                                    </svg>
                                  </div>
                                </button>
                              </div>
                              <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                  expandedTeams.has(team.id)
                                    ? 'max-h-[1000px]'
                                    : 'max-h-0'
                                }`}>
                                <div className='px-2 pb-1.5'>
                                  <div className='overflow-x-auto'>
                                    <table className='min-w-full divide-y divide-gray-200'>
                                      <thead>
                                        <tr>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Player
                                          </th>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Status
                                          </th>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Pos
                                          </th>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            R1
                                          </th>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            R2
                                          </th>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            R3
                                          </th>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            R4
                                          </th>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Cut
                                          </th>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Bonus
                                          </th>
                                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className='bg-white divide-y divide-gray-200'>
                                        {team.players.map((player) => (
                                          <tr key={player.id}>
                                            <td className='px-6 py-4 whitespace-nowrap'>
                                              <div className='flex items-center'>
                                                {player.player.imageUrl && (
                                                  <div className='flex-shrink-0 h-10 w-10'>
                                                    <img
                                                      className='h-10 w-10 rounded-full object-cover'
                                                      src={
                                                        player.player.imageUrl
                                                      }
                                                      alt={
                                                        player.player
                                                          .displayName ||
                                                        player.player.name
                                                      }
                                                    />
                                                  </div>
                                                )}
                                                <div className='ml-4'>
                                                  <div className='text-sm font-medium text-gray-900'>
                                                    {player.player
                                                      .displayName ||
                                                      player.player.name}
                                                  </div>
                                                </div>
                                              </div>
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-sm'>
                                              <div className='flex flex-col space-y-1'>
                                                <span
                                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    player.player.inField
                                                      ? 'bg-green-100 text-green-800'
                                                      : 'bg-yellow-100 text-yellow-800'
                                                  }`}>
                                                  {player.player.inField
                                                    ? 'In Field'
                                                    : 'Not In Field'}
                                                </span>
                                              </div>
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                              {player.leaderboardPosition ||
                                                '-'}
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                              {player.r1?.strokes || '-'}
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                              {player.r2?.strokes || '-'}
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                              {player.r3?.strokes || '-'}
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                              {player.r4?.strokes || '-'}
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                              {player.cut || '-'}
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                              {player.bonus || '-'}
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                              {player.total || '-'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rightColumnTab === 'createTeam' && isMember && (
                      <div className='h-full overflow-y-auto'>
                        <TeamFormComponent
                          teamId={userTeam?.id}
                          leagueId={leagueId}
                          initialTeam={userTeam || undefined}
                          onSuccess={(teamId, leagueId) => {
                            // Refresh teams data after creation
                            api
                              .getTeamsByLeague(leagueId)
                              .then((updatedTeams) => {
                                setTeams(updatedTeams);
                                const updatedUserTeam = updatedTeams.find(
                                  (team) =>
                                    team.userId ===
                                    localStorage.getItem('userId')
                                );
                                setUserTeam(updatedUserTeam || null);
                              });
                            // Switch back to teams tab
                            setRightColumnTab('teams');
                          }}
                          onCancel={() => setRightColumnTab('teams')}
                        />
                      </div>
                    )}

                    {rightColumnTab === 'liveBets' && (
                      <div className='h-full overflow-y-auto p-4'>
                        {renderLiveBetsContent()}
                      </div>
                    )}

                    {rightColumnTab === 'leagueSettings' && isMember && (
                      <div className='h-full overflow-y-auto'>
                        <h2 className='text-lg font-semibold mb-4'>
                          League Settings
                        </h2>
                        <div className='space-y-6'>
                          <div className='bg-white rounded-lg p-4 space-y-4'>
                            <dl className='space-y-3'>
                              <div className='flex justify-between items-center'>
                                <dt className='text-sm text-gray-500'>
                                  Members
                                </dt>
                                <dd className='text-sm font-medium text-gray-900'>
                                  {league.members.length}
                                </dd>
                              </div>
                              <div className='flex justify-between items-center'>
                                <dt className='text-sm text-gray-500'>Teams</dt>
                                <dd className='text-sm font-medium text-gray-900'>
                                  {teams.length}
                                </dd>
                              </div>
                              <div className='flex justify-between items-center'>
                                <dt className='text-sm text-gray-500'>
                                  Maximum Teams
                                </dt>
                                <dd className='text-sm font-medium text-gray-900'>
                                  {league.maxTeams}
                                </dd>
                              </div>
                              <div className='flex justify-between items-center'>
                                <dt className='text-sm text-gray-500'>
                                  League Type
                                </dt>
                                <dd className='text-sm font-medium text-gray-900'>
                                  {league.isPrivate
                                    ? 'Private League'
                                    : 'Public League'}
                                </dd>
                              </div>
                            </dl>
                            <div className='pt-4 border-t'>
                              <button
                                onClick={handleLeaveLeague}
                                disabled={isActionLoading}
                                className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                  isActionLoading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-700'
                                }`}>
                                {isActionLoading
                                  ? 'Processing...'
                                  : 'Leave League'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Mobile Layout */
          <div className='h-full flex flex-col bg-white rounded-lg border border-gray-200'>
            {/* Mobile Header */}
            <div className='p-4 border-b border-gray-200'>
              <h1 className='text-xl font-bold text-gray-900'>{league.name}</h1>
              {tournament && (
                <div className='mt-2 text-sm text-gray-600'>
                  <p>
                    {tournament.name} - {tournament.status.replace('-', ' ')}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Navigation */}
            {renderMobileNavigation()}

            {/* Mobile Content */}
            <div className='flex-1 overflow-y-auto'>
              {activeTab === 'chat' && renderChatContent()}
              {activeTab === 'teams' && (
                <div className='p-4'>
                  <div className='space-y-0'>
                    {teams.map((team, index) => (
                      <div
                        key={team.id}
                        className={`${
                          index === 0 ? 'border-t' : ''
                        } border-b border-gray-200`}>
                        <div className='w-full px-2 py-1.5 flex justify-between items-center'>
                          <button
                            onClick={() => toggleTeam(team.id)}
                            className='flex-1 flex justify-between items-center hover:bg-gray-100/50 transition-colors'>
                            <h3 className='text-base font-medium text-gray-700'>
                              {team.name}
                            </h3>
                            <div className='flex items-center space-x-2'>
                              <span className='text-sm font-medium text-gray-600'>
                                Score: {calculateTeamScore(team)}
                              </span>
                              <svg
                                className={`w-4 h-4 text-gray-400 transform transition-transform ${
                                  expandedTeams.has(team.id) ? 'rotate-180' : ''
                                }`}
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'>
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M19 9l-7 7-7-7'
                                />
                              </svg>
                            </div>
                          </button>
                        </div>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            expandedTeams.has(team.id)
                              ? 'max-h-[1000px]'
                              : 'max-h-0'
                          }`}>
                          <div className='px-2 pb-1.5'>
                            <div className='overflow-x-auto'>
                              <table className='min-w-full divide-y divide-gray-200'>
                                <thead>
                                  <tr>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Player
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Status
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Pos
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      R1
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      R2
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      R3
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      R4
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Cut
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Bonus
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className='bg-white divide-y divide-gray-200'>
                                  {team.players.map((player) => (
                                    <tr key={player.id}>
                                      <td className='px-6 py-4 whitespace-nowrap'>
                                        <div className='flex items-center'>
                                          {player.player.imageUrl && (
                                            <div className='flex-shrink-0 h-10 w-10'>
                                              <img
                                                className='h-10 w-10 rounded-full object-cover'
                                                src={player.player.imageUrl}
                                                alt={
                                                  player.player.displayName ||
                                                  player.player.name
                                                }
                                              />
                                            </div>
                                          )}
                                          <div className='ml-4'>
                                            <div className='text-sm font-medium text-gray-900'>
                                              {player.player.displayName ||
                                                player.player.name}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                                        <div className='flex flex-col space-y-1'>
                                          <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                              player.player.inField
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {player.player.inField
                                              ? 'In Field'
                                              : 'Not In Field'}
                                          </span>
                                        </div>
                                      </td>
                                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                        {player.leaderboardPosition || '-'}
                                      </td>
                                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                        {player.r1?.strokes || '-'}
                                      </td>
                                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                        {player.r2?.strokes || '-'}
                                      </td>
                                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                        {player.r3?.strokes || '-'}
                                      </td>
                                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                        {player.r4?.strokes || '-'}
                                      </td>
                                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                        {player.cut || '-'}
                                      </td>
                                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                        {player.bonus || '-'}
                                      </td>
                                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                        {player.total || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'createTeam' && isMember && (
                <div className='p-4'>
                  <TeamFormComponent
                    teamId={userTeam?.id}
                    leagueId={leagueId}
                    initialTeam={userTeam || undefined}
                    onSuccess={(teamId, leagueId) => {
                      // Refresh teams data after creation
                      api.getTeamsByLeague(leagueId).then((updatedTeams) => {
                        setTeams(updatedTeams);
                        const updatedUserTeam = updatedTeams.find(
                          (team) =>
                            team.userId === localStorage.getItem('userId')
                        );
                        setUserTeam(updatedUserTeam || null);
                      });
                      // Switch back to teams tab
                      setActiveTab('teams');
                    }}
                    onCancel={() => setActiveTab('teams')}
                  />
                </div>
              )}
              {activeTab === 'liveBets' && (
                <div className='p-4'>{renderLiveBetsContent()}</div>
              )}
              {activeTab === 'leagueSettings' && isMember && (
                <div className='p-4'>
                  <h2 className='text-lg font-semibold mb-4'>
                    League Settings
                  </h2>
                  <div className='space-y-6'>
                    <div className='bg-white rounded-lg p-4 space-y-4'>
                      <dl className='space-y-3'>
                        <div className='flex justify-between items-center'>
                          <dt className='text-sm text-gray-500'>Members</dt>
                          <dd className='text-sm font-medium text-gray-900'>
                            {league.members.length}
                          </dd>
                        </div>
                        <div className='flex justify-between items-center'>
                          <dt className='text-sm text-gray-500'>Teams</dt>
                          <dd className='text-sm font-medium text-gray-900'>
                            {teams.length}
                          </dd>
                        </div>
                        <div className='flex justify-between items-center'>
                          <dt className='text-sm text-gray-500'>
                            Maximum Teams
                          </dt>
                          <dd className='text-sm font-medium text-gray-900'>
                            {league.maxTeams}
                          </dd>
                        </div>
                        <div className='flex justify-between items-center'>
                          <dt className='text-sm text-gray-500'>League Type</dt>
                          <dd className='text-sm font-medium text-gray-900'>
                            {league.isPrivate
                              ? 'Private League'
                              : 'Public League'}
                          </dd>
                        </div>
                      </dl>
                      <div className='pt-4 border-t'>
                        <button
                          onClick={handleLeaveLeague}
                          disabled={isActionLoading}
                          className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActionLoading
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-700'
                          }`}>
                          {isActionLoading ? 'Processing...' : 'Leave League'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
