import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";
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
      <div className="mt-4 min-h-[80px] text-center">
        <p className="mb-4 font-display font-semibold text-gray-400">Searching for contests...</p>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-center font-display text-sm text-red-500">{error}</div>;
  }

  if (contests.length === 0) {
    return (
      <div>
        <p className="mb-1 font-display text-base font-semibold text-gray-900">No contests yet</p>
        <p className="font-display text-sm leading-relaxed text-gray-600">
          New contests will show up here when they open. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {contests.map((contest) => (
        <Link
          key={contest.id}
          to={contestLobbyPath(contest.address)}
          aria-label={`View ${contest.name} contest`}
          className="group block w-full min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <div className="flex min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition-[border-color,box-shadow,background-color] duration-200 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-md">
            <div className="min-w-0 flex-1 p-3 py-4">
              <ContestCard contest={contest} />
            </div>
            <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 border-l border-slate-50 bg-gradient-to-b from-slate-50/90 to-white px-2 text-blue-600 transition-colors duration-200 group-hover:border-blue-50 group-hover:bg-blue-100/60 group-hover:text-blue-700">
              <ChevronRightIcon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="font-display text-[10px] font-semibold uppercase leading-none tracking-wide">
                View
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
