import { Link } from "react-router-dom";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { contestLobbyLinkState } from "../../lib/contestNavigation";
import { formatContestStatus } from "../../lib/contestStatus";
import { cn } from "../../lib/tabStyles";

const actionButtonClassName =
  "inline-flex h-10 min-w-[5.5rem] shrink-0 items-center justify-center gap-0.5 rounded px-4 font-display text-sm font-semibold text-white transition-colors";

function contestListActionLabel(variant: ContestListItemVariant): string {
  return variant === "upcoming" ? "Join" : "View";
}

export type ContestListItemVariant = "default" | "upcoming" | "past";

function formatBuyInValue(primaryDeposit: number | undefined): string {
  if (primaryDeposit === 0) return "Free";
  if (primaryDeposit != null) return `$${primaryDeposit}`;
  return "—";
}

interface ContestListItemProps {
  contest: Contest;
  to: string;
  className?: string;
  eventShell?: CompetitionEventShell;
  variant?: ContestListItemVariant;
}

export const ContestListItem = ({
  contest,
  to,
  className,
  eventShell,
  variant = "default",
}: ContestListItemProps) => {
  const buyInValue = formatBuyInValue(contest.settings?.primaryDeposit);
  const actionLabel = contestListActionLabel(variant);
  const isPast = variant === "past";
  const leagueLabel = contest.userGroup?.name?.trim() || "Public";

  return (
    <Link
      to={to}
      state={eventShell ? contestLobbyLinkState(eventShell, contest) : undefined}
      aria-label={`${actionLabel} ${contest.name} contest`}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-display text-base font-semibold leading-tight",
            isPast ? "text-slate-600" : "text-gray-900",
          )}
        >
          {contest.name}
        </p>
        <p className="mt-0.5 truncate font-display text-sm text-gray-500">
          {buyInValue}
          <span aria-hidden> · </span>
          {leagueLabel}
          <span aria-hidden> · </span>
          <span className="shrink-0 font-display text-sm">
            {formatContestStatus(contest.status)}
          </span>
        </p>
      </div>

      <span
        className={cn(
          actionButtonClassName,
          isPast ? "bg-slate-500 group-hover:bg-slate-600" : "bg-blue-500 group-hover:bg-blue-600",
        )}
      >
        {actionLabel}
        <ChevronRightIcon className="-ml-0.5 h-4 w-4 shrink-0" aria-hidden />
      </span>
    </Link>
  );
};
