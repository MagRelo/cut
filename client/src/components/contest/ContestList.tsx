import { type Contest } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ContestListItem } from "./ContestListItem";

interface ContestListProps {
  contests: Contest[];
  loading: boolean;
  error: string | null;
}

export const ContestList = ({ contests, loading, error }: ContestListProps) => {
  if (loading) {
    return (
      <div className="mt-4 min-h-[80px] text-center">
        <p className="mb-4 font-display font-semibold text-gray-400">Searching for contests...</p>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-center font-display text-sm text-red-500">{error}</div>;
  }

  const listContent =
    contests.length === 0 ? (
      <div>
        <p className="mb-1 font-display text-base font-semibold text-gray-900">No contests yet</p>
        <p className="font-display text-sm leading-relaxed text-gray-600">
          New contests will show up here when they open. Check back soon.
        </p>
      </div>
    ) : (
      <div className="grid gap-3">
        {contests.map((contest) => (
          <Link
            key={contest.id}
            to={contestLobbyPath(contest.address)}
            aria-label={`View ${contest.name} contest`}
            className="group block w-full min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <ContestListItem
              contest={contest}
              className="transition-[border-color,box-shadow,background-color] duration-200 group-hover:border-blue-200 group-hover:bg-blue-50/30 group-hover:shadow-md"
            />
          </Link>
        ))}
      </div>
    );

  return listContent;
};
