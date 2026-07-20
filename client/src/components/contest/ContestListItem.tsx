import { Link } from "react-router-dom";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { contestLobbyLinkState } from "../../lib/contestNavigation";
import { formatContestStatus, contestStatusValueClass } from "../../lib/contestStatus";
import { cn } from "../../lib/tabStyles";
import { ContestCard } from "./ContestCard";

const viewButtonBaseClassName =
  "inline-flex min-w-[88px] items-center justify-center gap-1 rounded border px-4 py-1.5 font-display text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const viewButtonActiveClassName =
  "border-blue-500 bg-blue-500 text-white hover:bg-blue-600 focus-visible:outline-blue-500";

const viewButtonPastClassName =
  "border-slate-300 bg-slate-200 text-slate-800 hover:bg-slate-200 focus-visible:outline-slate-500";

function isPastContestStatus(status: Contest["status"]): boolean {
  return status === "SETTLED" || status === "CLOSED";
}

function contestListFooterClass(status: Contest["status"]): string {
  if (status === "OPEN" || status === "ACTIVE") return "border-blue-200 bg-blue-50";
  return "border-slate-300 bg-slate-100";
}

function isPastViewButton(contest: Contest, variant: ContestListItemVariant): boolean {
  return variant === "past" || isPastContestStatus(contest.status);
}

function contestListActionLabel(variant: ContestListItemVariant): string {
  return variant === "upcoming" ? "Join" : "View";
}

export type ContestListItemVariant = "default" | "upcoming" | "past";

function formatBuyInValue(primaryDeposit: number | undefined): string {
  if (primaryDeposit === 0) return "Free";
  if (primaryDeposit != null) return `$${primaryDeposit}`;
  return "—";
}

function ContestListStat({
  value,
  label,
  valueClassName,
}: {
  value: string | number;
  label: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <div
        className={cn(
          "font-display text-sm font-bold tabular-nums leading-none",
          valueClassName ?? "text-gray-900",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-wide text-gray-500">
        {label}
      </div>
    </div>
  );
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
  const entryCount = contest.contestLineups?.length ?? 0;
  const buyInValue = formatBuyInValue(contest.settings?.primaryDeposit);
  const actionLabel = contestListActionLabel(variant);

  return (
    <div
      className={cn(
        "group min-w-0 overflow-hidden rounded-md border border-slate-500 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition-[border-color,box-shadow] duration-200 hover:border-blue-200 hover:shadow-md",
        className,
      )}
    >
      <div className="p-2 pt-3">
        <ContestCard contest={contest} />
      </div>

      <div
        className={cn(
          "flex items-center gap-3 border-t p-2 pt-2.5",
          contestListFooterClass(contest.status),
        )}
      >
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
          <ContestListStat value={buyInValue} label="Buy-in" />
          <ContestListStat value={entryCount} label="Entries" />
          <ContestListStat
            value={formatContestStatus(contest.status)}
            label="Status"
            valueClassName={contestStatusValueClass(contest.status)}
          />
        </div>
        <Link
          to={to}
          state={eventShell ? contestLobbyLinkState(eventShell, contest) : undefined}
          aria-label={`${actionLabel} ${contest.name} contest`}
          className={cn(
            viewButtonBaseClassName,
            isPastViewButton(contest, variant)
              ? viewButtonPastClassName
              : viewButtonActiveClassName,
          )}
        >
          {actionLabel}
          <ChevronRightIcon className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </div>
    </div>
  );
};
