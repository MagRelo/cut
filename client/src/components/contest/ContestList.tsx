import { type Contest } from '../../types.new/contest';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ContestCard } from './ContestCard';

interface ContestListProps {
  contests: Contest[];
  loading: boolean;
  error: string | null;
  preTournament?: boolean;
}

export const ContestList = ({
  contests,
  loading,
  error,
  preTournament = false,
}: ContestListProps) => {
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
          <ContestCard
            key={contest.id}
            contest={contest}
            preTournament={preTournament}
          />
        ))}
      </div>
    </div>
  );
};
