import type { CompetitionEventShell } from "@cut/sport-sdk";
import { ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { Link } from "react-router-dom";
import { cn } from "../../lib/tabStyles";
import { LEAGUE_STARTER_GUIDE_PATH } from "../../pages/LeagueStarterGuidePage";
import { Button } from "../common/Button";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ContestListItem, type ContestListItemVariant } from "./ContestListItem";

interface ContestListProps {
  contests: Contest[];
  loading: boolean;
  error: string | null;
  eventShell?: CompetitionEventShell;
  variant?: ContestListItemVariant;
  createContestTo?: string;
  onDeleteContest?: (contest: Contest) => void;
}

export function ContestListConnectHint({ className = "mt-6" }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-blue-600 bg-white px-4 py-4 text-left font-display shadow-md shadow-blue-600/30",
        className,
      )}
    >
      <p className="mb-1 text-xs font-semibold uppercase leading-5 tracking-[0.16em] text-blue-600">
        Private leagues
      </p>
      <p className="text-base font-semibold leading-snug text-slate-900">
        There’s more to play for.
      </p>
      <p className="mt-1 text-sm leading-snug text-slate-600">
        Play for real money in private leagues. Start your own or join friends for the next
        tournament.
      </p>
      <Button to={LEAGUE_STARTER_GUIDE_PATH} className="mt-4">
        Explore private leagues
        <ChevronRightIcon className="-ml-0.5 h-4 w-4 shrink-0" aria-hidden />
      </Button>
      <p className="mt-3 text-sm text-slate-500">
        Already in a league?{" "}
        <Link
          to="/connect"
          state={{ from: { pathname: "/leagues", search: "", hash: "" } }}
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function CreateContestRow({ to }: { to: string }) {
  return (
    <div className="flex items-center justify-end px-4 py-3">
      <Button to={to}>
        <PlusIcon className="-ml-0.5 h-4 w-4 shrink-0" aria-hidden />
        Create contest
      </Button>
    </div>
  );
}

export const ContestList = ({
  contests,
  loading,
  error,
  eventShell,
  variant = "default",
  createContestTo,
  onDeleteContest,
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
    return <ErrorMessage message={error} className="text-center" />;
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
    <ul className="divide-y divide-slate-300">
      {contests.map((contest) => (
        <li key={contest.id}>
          <ContestListItem
            contest={contest}
            to={contestLobbyPath(contest)}
            eventShell={eventShell}
            variant={variant}
            onDelete={onDeleteContest}
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
