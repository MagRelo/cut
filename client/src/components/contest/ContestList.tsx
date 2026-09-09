import type { CompetitionEventShell } from "@cut/sport-sdk";
import { ExclamationTriangleIcon, PlusIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { Link } from "react-router-dom";
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

export function ContestListConnectHint({
  message = "to see league contests",
  className = "mt-6 text-center",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <p className={`font-display text-sm text-gray-600 ${className}`}>
      <Link to="/connect" className="font-semibold text-blue-600 hover:text-blue-700">
        Sign in
      </Link>{" "}
      {message}
    </p>
  );
}

function emptySlotClassName(nest: "default" | "hero"): string {
  return nest === "hero"
    ? "rounded-lg border border-white/50 bg-white/95 p-4 shadow-lg shadow-black/20 backdrop-blur-md"
    : "rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm";
}

function CreateContestSlot({ to, nest }: { to: string; nest: "default" | "hero" }) {
  return (
    <Link
      to={to}
      className={`${emptySlotClassName(nest)} group flex min-h-[7.5rem] flex-col items-center justify-center gap-2 text-center transition-colors hover:border-blue-400 hover:bg-blue-50`}
    >
      <span className="mb-2 inline-flex items-center gap-1 font-display text-xs text-gray-700">
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        No active contests
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2.5 font-display text-sm font-medium text-white group-hover:bg-blue-700">
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
