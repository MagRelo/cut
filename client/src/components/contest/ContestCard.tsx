import { Link } from "react-router-dom";
import { type Contest } from "../../types/contest";
import { useContestPotDisplay } from "../../hooks/useContestPotDisplay";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
  onPotClick?: () => void;
  /** Settings gear beside pot — contest lobby only, not list rows. */
  showPotIcon?: boolean;
  linkUserGroup?: boolean;
}

export const ContestCard = ({
  contest,
  onPotClick,
  showPotIcon = false,
  linkUserGroup = false,
}: ContestCardProps) => {
  const { displayPot, showLoading, showPotUnavailable } = useContestPotDisplay(contest);
  const isFreeContest = (contest.settings?.primaryDeposit ?? 0) === 0;
  const showPot = !isFreeContest;
  const groupName = contest.userGroup?.name?.trim() || "Public";
  const groupId = contest.userGroup?.id ?? contest.userGroupId;
  const groupTitle =
    linkUserGroup && groupId && contest.userGroup?.name ? (
      <Link
        to={`/leagues/${groupId}`}
        className="truncate hover:text-gray-700 hover:underline focus:outline-none focus-visible:underline"
      >
        {groupName}
      </Link>
    ) : (
      <span className="truncate">{groupName}</span>
    );

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
      <div className="min-w-0 flex-1 overflow-hidden">
        <h3 className="text-grey-900 flex min-w-0 items-center gap-1.5 font-display text-base font-semibold leading-tight">
          {groupTitle}
        </h3>
      </div>

      {showPot || (onPotClick && showPotIcon) ? (
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {onPotClick ? (
            <button
              type="button"
              onClick={onPotClick}
              aria-label="Contest settings"
              className="flex items-center gap-5 rounded text-right transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              {showPotIcon ? (
                <Cog6ToothIcon className="h-5 w-5 shrink-0 text-blue-500" aria-hidden />
              ) : null}
              {potValue}
            </button>
          ) : (
            <div className="text-right">{potValue}</div>
          )}
        </div>
      ) : null}
    </div>
  );
};
