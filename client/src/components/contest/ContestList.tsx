import { type Contest } from "../../types/contest";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ContestCard } from "./ContestCard";

interface ContestListProps {
  contests: Contest[];
  loading: boolean;
  error: string | null;
}

export const ContestList = ({ contests, loading, error }: ContestListProps) => {
  if (loading) {
    return (
      <div className="text-center min-h-[80px] mt-4">
        <p className="text-gray-400 font-semibold font-display mb-4">Searching for contests...</p>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 font-display text-sm text-center">{error}</div>;
  }

  if (contests.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm shadow p-4">
        <p className="text-base font-semibold text-gray-900 font-display mb-1">No contests yet</p>
        <p className="text-sm text-gray-600 font-display leading-relaxed">
          New contests will show up here when they open. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {contests.map((contest) => (
        <Link key={contest.id} to={`/contest/${contest.id}`} className="block">
          <div className="bg-white rounded-sm border border-gray-200 p-3 py-4 shadow">
            <ContestCard contest={contest} />
          </div>
        </Link>
      ))}
    </div>
  );
};
