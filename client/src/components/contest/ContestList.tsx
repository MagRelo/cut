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
      <div className="flex items-center justify-center min-h-[176px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (contests.length === 0) {
    return <div>No contests found</div>;
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
