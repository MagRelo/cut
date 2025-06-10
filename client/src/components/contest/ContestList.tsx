import { useEffect, useState } from 'react';
import { useContestApi } from '../../services/contestApi';
import { type Contest } from '../../types.new/contest';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const ContestList = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contestApi = useContestApi();

  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        const data = await contestApi.getAllContests();
        setContests(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching contests:', err);
        setError('Failed to fetch contests');
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, [contestApi]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[200px]'>
        <LoadingSpinner size='large' />
      </div>
    );
  }

  if (error) {
    return <div className='text-red-500'>{error}</div>;
  }

  if (contests.length === 0) {
    return <div>No contests found</div>;
  }

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {contests.map((contest) => (
          <Link to={`/contest/${contest.id}`} key={contest.id}>
            <div
              key={contest.id}
              className='p-4 border bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow'>
              <h3 className='text-lg font-semibold'>{contest.name}</h3>

              <p className='text-gray-600 font-medium text-sm'>
                Buy-In: {'$10'}
              </p>

              <p className='text-gray-600 font-medium text-sm'>
                Max Payout: {'$1000'}
              </p>
              <p className='text-gray-600 font-medium text-sm'>
                Entries: {contest?.contestLineups?.length ?? 0}/
                {String(contest?.settings?.maxPlayers ?? 0)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
