import { MenuItem } from "@headlessui/react";
import {
  CheckCircleIcon,
  SignalIcon,
} from "@heroicons/react/24/solid";
import { MinusCircleIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLiveContestsAcrossSports } from "../../hooks/useLiveContestsAcrossSports";
import {
  contestParticipationLabel,
  getContestParticipationStatus,
  type ContestParticipationStatus,
} from "../../lib/contestParticipationStatus";
import type { Contest } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";

type UserContestsNavListProps = {
  variant: "mobile" | "dropdown";
};

const sectionLabelClass =
  "px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400";

const mobileItemClass =
  "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-display text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40";

const dropdownItemClass =
  "flex w-full items-center gap-2.5 py-2 pl-7 pr-4 text-left text-sm font-display text-slate-700 data-[focus]:bg-slate-50 data-[focus]:text-slate-900";

const iconClass = "h-5 w-5 shrink-0";

function ContestParticipationIcon({ status }: { status: ContestParticipationStatus }) {
  const label = contestParticipationLabel(status);

  switch (status) {
    case "not-joined":
      return <MinusCircleIcon className={`${iconClass} text-slate-500`} aria-label={label} />;
    case "joined":
      return <CheckCircleIcon className={`${iconClass} text-emerald-600`} aria-label={label} />;
    case "in-progress":
      return <SignalIcon className={`${iconClass} text-blue-600`} aria-label={label} />;
  }
}

function sortContestsForNav(contests: Contest[]): Contest[] {
  return [...contests].sort((a, b) => {
    const feeA = a.settings?.primaryDeposit ?? 0;
    const feeB = b.settings?.primaryDeposit ?? 0;
    if (feeB !== feeA) return feeB - feeA;
    return a.name.localeCompare(b.name);
  });
}

function ContestNavLink({
  contest,
  userId,
  variant,
}: {
  contest: Contest;
  userId: string;
  variant: UserContestsNavListProps["variant"];
}) {
  const status = getContestParticipationStatus(contest, userId);
  const itemClass = variant === "mobile" ? mobileItemClass : dropdownItemClass;
  const leagueName = contest.userGroup?.name;

  const link = (
    <Link to={contestLobbyPath(contest.address)} className={itemClass} title={contest.name}>
      <ContestParticipationIcon status={status} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{contest.name}</span>
        {leagueName ? (
          <span className="block truncate text-xs text-slate-500">{leagueName}</span>
        ) : null}
      </span>
    </Link>
  );

  if (variant === "dropdown") {
    return <MenuItem>{link}</MenuItem>;
  }

  return link;
}

export function UserContestsNavList({ variant }: UserContestsNavListProps) {
  const { user } = useAuth();
  const { contests, isLoading, error } = useLiveContestsAcrossSports();

  const sortedContests = useMemo(() => {
    const visible = contests.filter((contest) => contest.status !== "CANCELLED");
    return sortContestsForNav(visible);
  }, [contests]);

  if (!user) {
    return null;
  }

  const hasContests = sortedContests.length > 0;

  if (isLoading && !hasContests) {
    const loading = <div className={`${sectionLabelClass} text-slate-500`}>Loading contests…</div>;
    if (variant === "mobile") {
      return (
        <div className="ml-2 mt-0.5 flex flex-col gap-1 border-l border-slate-100 pl-2">
          {loading}
        </div>
      );
    }
    return <div className="border-y border-slate-100 py-1">{loading}</div>;
  }

  if (error && !hasContests) {
    return null;
  }

  if (!hasContests) {
    return null;
  }

  const items = sortedContests.map((contest) => (
    <ContestNavLink key={contest.id} contest={contest} userId={user.id} variant={variant} />
  ));

  if (variant === "mobile") {
    return (
      <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-slate-100 pl-2">{items}</div>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto border-y border-slate-100 py-1">{items}</div>
  );
}
