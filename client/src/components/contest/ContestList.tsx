import { type Contest } from '../../types.new/contest';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ContestListProps {
  contests: Contest[];
  loading: boolean;
  error: string | null;
}

export const ContestList = ({ contests, loading, error }: ContestListProps) => {
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
    <div className='space-y-2'>
      <div className='grid gap-2 md:grid-cols-2 lg:grid-cols-3'>
        {contests.map((contest) => (
          <Link to={`/contest/${contest.id}`} key={contest.id}>
            <div
              key={contest.id}
              className='p-4 border bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3'>
              <h3 className='text-lg font-extrabold leading-tight'>
                {contest.name}
              </h3>

              <div className='flex items-center justify-center gap-4'>
                <div className='flex items-center gap-2'>
                  <span className='text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none'>
                    Entries:
                  </span>
                  <span className='text-base text-gray-700 font-medium leading-none'>
                    {contest?.contestLineups?.length ?? 0}/
                    {String(contest?.settings?.maxPlayers ?? 0)}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none'>
                    Max:
                  </span>
                  <span className='text-base text-gray-700 font-medium leading-none'>
                    $40
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none'>
                    Entry:
                  </span>
                  <span className='text-base text-gray-700 font-medium leading-none'>
                    $10
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
