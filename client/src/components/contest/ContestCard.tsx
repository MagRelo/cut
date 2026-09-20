import { Link } from "react-router-dom";
import { type Contest } from "../../types/contest";
import { useContestPotDisplay } from "../../hooks/useContestPotDisplay";
import { Cog6ToothIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { cn } from "../../lib/tabStyles";

export type ContestCardTone = "paper" | "live" | "past";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
  onPotClick?: () => void;
  /** Settings gear beside pot — contest lobby only, not list rows. */
  showPotIcon?: boolean;
  linkUserGroup?: boolean;
  /** Directory list rows only. Lobby stays paper. */
  tone?: ContestCardTone;
}

const titleToneClassName: Record<ContestCardTone, string> = {
  paper: "text-gray-900",
  live: "text-blue-900",
  past: "text-slate-900",
};

const groupToneClassName: Record<ContestCardTone, string> = {
  paper: "text-slate-600",
  live: "text-blue-900",
  past: "text-slate-900",
};

const groupLinkHoverClassName: Record<ContestCardTone, string> = {
  paper: "hover:text-slate-800",
  live: "hover:text-blue-950",
  past: "hover:text-slate-950",
};

export const ContestCard = ({
  contest,
  onPotClick,
  showPotIcon = false,
  linkUserGroup = false,
  tone = "paper",
}: ContestCardProps) => {
  const { displayPot, showLoading, showPotUnavailable } = useContestPotDisplay(contest);
  const isFreeContest = (contest.settings?.primaryDeposit ?? 0) === 0;
  const showPot = !isFreeContest;

  const potValue = showPot ? (
    <div>
      <div className="font-display text-xl font-bold tabular-nums leading-none text-emerald-600">
        {showLoading ? "..." : showPotUnavailable ? "—" : `$${displayPot}`}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
        POT
      </div>
    </div>
  ) : null;

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2.5">
      <div className="min-w-0 flex-1 overflow-hidden pl-2">
        <h3
          className={cn(
            "truncate font-display text-xl font-bold leading-tight",
            titleToneClassName[tone],
          )}
        >
          {contest.name}
        </h3>
        <p
          className={cn(
            "mt-0.5 flex min-w-0 items-center gap-1 truncate font-display text-sm font-medium",
            groupToneClassName[tone],
          )}
        >
          {contest.userGroup?.name ? (
            <>
              <UserGroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {linkUserGroup && (contest.userGroup.id || contest.userGroupId) ? (
                <Link
                  to={`/leagues/${contest.userGroup.id ?? contest.userGroupId}`}
                  className={cn(
                    "truncate hover:underline focus:outline-none focus-visible:underline",
                    groupLinkHoverClassName[tone],
                  )}
                >
                  {contest.userGroup.name}
                </Link>
              ) : (
                <span className="truncate">{contest.userGroup.name}</span>
              )}
            </>
          ) : (
            <>
              <span className="truncate">Public</span>
            </>
          )}
        </p>
      </div>

      {showPot || (onPotClick && showPotIcon) ? (
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {onPotClick ? (
            <button
              type="button"
              onClick={onPotClick}
              aria-label="Contest settings"
              className="ml-2 mr-2 flex items-center gap-3 rounded text-right transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              {showPotIcon ? (
                <Cog6ToothIcon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              ) : null}
              {potValue}
            </button>
          ) : (
            <div className="ml-2 mr-2 text-right">{potValue}</div>
          )}
        </div>
      ) : null}
    </div>
  );
};
