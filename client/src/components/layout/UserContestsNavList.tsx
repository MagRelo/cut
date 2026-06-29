import { MenuItem } from "@headlessui/react";
import {
  CheckCircleIcon,
  SignalIcon,
} from "@heroicons/react/24/solid";
import { MinusCircleIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLiveContestsAcrossSports } from "../../hooks/useLiveContestsAcrossSports";
import {
  contestParticipationLabel,
  getContestParticipationStatus,
  type ContestParticipationStatus,
} from "../../lib/contestParticipationStatus";
import type { LeagueContest } from "../contest/GroupedContestList";
import type { Contest } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";

const SPORT_EMOJI: Record<string, string> = {
  "pga-golf": "⛳",
  f1: "🏁",
};

function contestSportId(contest: Contest): string | undefined {
  const league = contest as LeagueContest;
  return contest.event?.sportId ?? league.eventSummary?.sportId;
}

type UserContestsNavListProps = {
  variant: "mobile" | "dropdown";
  onNavigate?: () => void;
  insetListClass?: string;
};

const defaultMobileInsetListClass =
  "ml-2 flex flex-col gap-0.5 border-l border-slate-100 pl-2";

const sectionLabelClass =
  "px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400";

const mobileItemBase =
  "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-display transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40";

function mobileItemClass(active: boolean) {
  return [
    mobileItemBase,
    active
      ? "bg-slate-100 font-semibold text-slate-950"
      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
  ].join(" ");
}

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

function ContestSportEmoji({ sportId }: { sportId: string | undefined }) {
  const emoji = (sportId && SPORT_EMOJI[sportId]) ?? "🏆";

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
      {emoji}
    </span>
  );
}

function ContestNavIcon({
  contest,
  status,
  variant,
}: {
  contest: Contest;
  status: ContestParticipationStatus;
  variant: UserContestsNavListProps["variant"];
}) {
  if (variant === "mobile") {
    return <ContestSportEmoji sportId={contestSportId(contest)} />;
  }

  return <ContestParticipationIcon status={status} />;
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
  onNavigate,
  isActive = false,
}: {
  contest: Contest;
  userId: string;
  variant: UserContestsNavListProps["variant"];
  onNavigate?: () => void;
  isActive?: boolean;
}) {
  const status = getContestParticipationStatus(contest, userId);
  const itemClass = variant === "mobile" ? mobileItemClass(isActive) : dropdownItemClass;
  const leagueName = contest.userGroup?.name;

  const link = (
    <Link
      to={contestLobbyPath(contest.address)}
      className={itemClass}
      title={contest.name}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
    >
      <ContestNavIcon contest={contest} status={status} variant={variant} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{contest.name}</span>
        {leagueName ? (
          <span className="block truncate text-xs text-slate-500">{leagueName}</span>
        ) : null}
      </span>
    </Link>
  );

  if (variant === "dropdown") {
    return (
      <MenuItem>
        {({ close }) => (
          <Link
            to={contestLobbyPath(contest.address)}
            className={itemClass}
            title={contest.name}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              onNavigate?.();
              close();
            }}
          >
            <ContestNavIcon contest={contest} status={status} variant={variant} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{contest.name}</span>
              {leagueName ? (
                <span className="block truncate text-xs text-slate-500">{leagueName}</span>
              ) : null}
            </span>
          </Link>
        )}
      </MenuItem>
    );
  }

  return link;
}

export function UserContestsNavList({
  variant,
  onNavigate,
  insetListClass = defaultMobileInsetListClass,
}: UserContestsNavListProps) {
  const { user } = useAuth();
  const location = useLocation();
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
        <div className={insetListClass}>
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

  const items = sortedContests.map((contest) => {
    const contestPath = contestLobbyPath(contest.address);
    const isActive = location.pathname === contestPath;

    return (
      <ContestNavLink
        key={contest.id}
        contest={contest}
        userId={user.id}
        variant={variant}
        onNavigate={onNavigate}
        isActive={isActive}
      />
    );
  });

  if (variant === "mobile") {
    return <div className={insetListClass}>{items}</div>;
  }

  return (
    <div className="max-h-56 overflow-y-auto border-y border-slate-100 py-1">{items}</div>
  );
}
