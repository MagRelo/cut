import type { CompetitionEventShell } from "@cut/sport-sdk";
import { BanknotesIcon, PlusIcon } from "@heroicons/react/24/outline";
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
  nest?: "default" | "hero";
  createContestTo?: string;
}

export function ContestListConnectHint({ className = "mt-6" }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-blue-200 bg-gradient-to-br from-blue-200 via-blue-50 to-slate-100 p-4 text-center font-display shadow-md shadow-blue-950/10",
        className,
      )}
    >
      <p className="text-base font-semibold text-gray-900">
        <span className="mr-1.5 inline-flex h-8 w-8 -translate-y-px items-center justify-center rounded-full border border-emerald-600 bg-white align-middle">
          <BanknotesIcon className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
        </span>
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

function emptySlotClassName(nest: "default" | "hero"): string {
  return nest === "hero" ? "rounded-lg  bg-transparent p-4" : "rounded-lg bg-transparent p-3.5";
}

function CreateContestSlot({ to, nest }: { to: string; nest: "default" | "hero" }) {
  return (
    <Link
      to={to}
      className={`${emptySlotClassName(nest)} group flex min-h-[5.5rem] flex-col items-center justify-center gap-2 text-center`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2.5 font-display text-sm font-medium text-white">
        <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
        Create Contest
      </span>
    </Link>
  );
}

export const ContestList = ({
  contests,
  loading,
  error,
  eventShell,
  variant = "default",
  nest = "default",
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
      return <CreateContestSlot to={createContestTo} nest={nest} />;
    }
    return (
      <div className={emptySlotClassName(nest)}>
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
    <div className="grid gap-3 md:grid-cols-2">
      {contests.map((contest) => (
        <ContestListItem
          key={contest.id}
          contest={contest}
          to={contestLobbyPath(contest)}
          eventShell={eventShell}
          variant={variant}
        />
      ))}
      {createContestTo ? <CreateContestSlot to={createContestTo} nest={nest} /> : null}
    </div>
  );
};
