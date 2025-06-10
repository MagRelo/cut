import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Contest } from 'src/types.new/contest';

import { useContestApi } from '../services/contestApi';
import { usePortoAuth } from '../contexts/PortoAuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

import { Tab, TabPanel, TabList, TabGroup } from '@headlessui/react';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export const ContestLobby: React.FC = () => {
  const { id: contestId } = useParams<{ id: string }>();
  const { getContestById, addLineupToContest, removeLineupFromContest } =
    useContestApi();
  const { user } = usePortoAuth();

  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContest = async () => {
    if (!contestId) return;

    try {
      setIsLoading(true);
      const contest = await getContestById(contestId);
      setContest(contest);
      setError(null);
    } catch (err) {
      setError(
        `Failed to load contest: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContest();
  }, [contestId]);

  const handleJoinContest = async () => {
    const tournamentLineupId = user?.tournamentLineups?.[0]?.id || '';
    try {
      await addLineupToContest(contestId!, { tournamentLineupId });
      await fetchContest();
    } catch (err) {
      setError(
        `Failed to join contest: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    }
  };

  const handleLeaveContest = async () => {
    try {
      await removeLineupFromContest(contestId!, userContestLineup?.id ?? '');
      await fetchContest();
    } catch (err) {
      setError(
        `Failed to leave contest: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    }
  };

  // find user lineup in contest
  const userContestLineup = contest?.contestLineups?.find(
    (lineup) => lineup.userId === user?.id
  );
  const userInContest = userContestLineup?.userId === user?.id;

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[200px]'>
        <LoadingSpinner size='large' />
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className='space-y-4 p-4'>
      <div className='bg-white rounded-lg shadow'>
        {/* header */}

        <div className='px-4 py-2'>
          <h3 className='text-2xl font-semibold text-gray-800'>
            {contest?.name}
          </h3>

          <p className='text-gray-600 font-medium text-sm'>
            {contest?.tournament?.name ?? ''} - {'Full Tournament'}
          </p>

          {/* <p className='text-gray-600 font-medium text-sm'>
            Status: {contest?.status ?? ''}
          </p> */}
          <p className='text-gray-600 font-medium text-sm'>
            Max Payout: {'$1220'}
          </p>
          <p className='text-gray-600 font-medium text-sm'>
            Entries: {contest?.contestLineups?.length ?? 0}/
            {String(contest?.settings?.maxPlayers ?? 0)}
          </p>
        </div>

        <TabGroup>
          <TabList className='flex space-x-1 border-b border-gray-200 px-4'>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  'w-full py-2 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'border-b-2 border-emerald-500 text-emerald-600'
                    : 'text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )
              }>
              Teams
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  'w-full py-2 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'border-b-2 border-emerald-500 text-emerald-600'
                    : 'text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )
              }>
              Details
            </Tab>
          </TabList>
          <div className='p-6'>
            <TabPanel>
              {userInContest ? (
                <div>
                  {contest?.contestLineups?.map((lineup) => (
                    <div key={lineup.id}>{lineup?.user?.name}</div>
                  ))}
                </div>
              ) : (
                <div className='flex flex-col gap-2'>
                  <button
                    className='mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
                    onClick={handleJoinContest}
                    disabled={userInContest}>
                    Join Contest - $100
                  </button>
                </div>
              )}
            </TabPanel>
            <TabPanel>
              <div className='flex flex-col gap-2'>
                <div className='grid grid-cols-[85px_1fr] gap-2'>
                  <div className='font-medium'>Status:</div>
                  <div>{contest?.status}</div>
                  <div className='font-medium'>Scoring:</div>
                  <div>{String(contest?.settings?.scoringType ?? '')}</div>
                </div>

                <button
                  className='mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50'
                  onClick={handleLeaveContest}
                  disabled={!userInContest}>
                  Leave Contest
                </button>
              </div>
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
};
