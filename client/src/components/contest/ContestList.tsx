import { type Contest } from "../../types/contest";
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
      <div className="text-center my-8">
        <p className="text-gray-400 font-semibold font-display">No contests found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {contests.map((contest) => (
          <div
            key={contest.id}
            className="border bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <ContestCard contest={contest} />
          </div>
        ))}
      </div>
    </div>
  );
};
