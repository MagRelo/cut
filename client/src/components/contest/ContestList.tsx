import type { CompetitionEventShell } from "@cut/sport-sdk";
import { PlusIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { Link } from "react-router-dom";
import { cn } from "../../lib/tabStyles";
import { LEAGUE_STARTER_GUIDE_PATH } from "../../pages/LeagueStarterGuidePage";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ContestListItem, type ContestListItemVariant } from "./ContestListItem";

interface ContestListProps {
  contests: Contest[];
  loading: boolean;
  error: string | null;
  eventShell?: CompetitionEventShell;
  variant?: ContestListItemVariant;
  createContestTo?: string;
}

export function ContestListConnectHint({ className = "mt-6" }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-blue-200 bg-blue-100 p-4 text-center font-display shadow-md shadow-blue-950/10",
        className,
      )}
    >
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 font-display text-base font-bold leading-none text-white"
        aria-hidden
      >
        $
      </span>
      <p className="mt-2 text-base font-semibold leading-snug text-gray-900">
        Real money contests available in private leagues
      </p>
      <p className="mt-1 text-sm text-gray-600">Sign in to see leagues you’re in, or start one.</p>
      <Link
        to="/leagues"
        className="mt-3 inline-flex h-10 min-w-[5.5rem] items-center justify-center rounded bg-blue-500 px-4 font-display text-sm font-semibold text-white transition-colors hover:bg-blue-600"
      >
        Sign in
      </Link>
      <p className="mt-2.5 text-sm text-gray-600">
        <Link to={LEAGUE_STARTER_GUIDE_PATH} className="text-blue-600 hover:text-blue-700">
          How leagues work →
        </Link>
      </p>
    </div>
  );
}

function CreateContestRow({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-4 py-3 font-display text-sm font-semibold text-gray-900 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
    >
      <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
      Create contest
    </Link>
  );
}

export const ContestList = ({
  contests,
  loading,
  error,
  eventShell,
  variant = "default",
  createContestTo,
}: ContestListProps) => {
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
    if (createContestTo) {
      return (
        <ul>
          <li>
            <CreateContestRow to={createContestTo} />
          </li>
        </ul>
      );
    }
    return (
      <div className="px-4 py-4">
        <p className="mb-1 font-display text-base font-semibold text-gray-900">
          New contests coming soon!
        </p>
        <p className="font-display text-sm text-gray-600">
          New contests will show up here when they open. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-200">
      {contests.map((contest) => (
        <li key={contest.id}>
          <ContestListItem
            contest={contest}
            to={contestLobbyPath(contest)}
            eventShell={eventShell}
            variant={variant}
          />
        </li>
      ))}
      {createContestTo ? (
        <li>
          <CreateContestRow to={createContestTo} />
        </li>
      ) : null}
    </ul>
  );
};
