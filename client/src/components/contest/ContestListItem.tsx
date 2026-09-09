import { Link } from "react-router-dom";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { contestLobbyLinkState } from "../../lib/contestNavigation";
import { formatContestStatus, contestStatusValueClass } from "../../lib/contestStatus";
import { cn } from "../../lib/tabStyles";
import { ContestCard } from "./ContestCard";

const ctaBaseClassName =
  "inline-flex h-10 min-w-[5.5rem] shrink-0 items-center justify-center gap-0.5 rounded px-4 font-display text-sm font-semibold transition-colors";

const ctaJoinClassName = "bg-emerald-600 text-white group-hover/footer:bg-emerald-700";

const ctaPastClassName = "bg-blue-500 text-white group-hover/footer:bg-blue-600";

function isPastContestStatus(status: Contest["status"]): boolean {
  return status === "SETTLED" || status === "CLOSED";
}

function isPastViewButton(contest: Contest, variant: ContestListItemVariant): boolean {
  return variant === "past" || isPastContestStatus(contest.status);
}

function contestListFooterClass(contest: Contest, variant: ContestListItemVariant): string {
  if (isPastViewButton(contest, variant)) return "border-slate-100 bg-slate-50";
  return "border-emerald-100 bg-emerald-50/80";
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
  valueClassName?: string;
  label: string;
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
      <div className="mt-1 text-[11px] font-semibold uppercase leading-none tracking-wide text-slate-500">
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
  const entryCount = contest._count?.contestLineups ?? contest.contestLineups?.length ?? 0;
  const buyInValue = formatBuyInValue(contest.settings?.primaryDeposit);
  const actionLabel = contestListActionLabel(variant);
  const pastAction = isPastViewButton(contest, variant);

  return (
    <div
      className={cn(
        "group min-w-0 overflow-hidden rounded bg-white shadow-md shadow-slate-900/10 ring-1 ring-black/5 transition-shadow duration-200 hover:shadow-lg",
        className,
      )}
    >
      <div className="p-2.5 pt-3">
        <ContestCard contest={contest} />
      </div>

      <Link
        to={to}
        state={eventShell ? contestLobbyLinkState(eventShell, contest) : undefined}
        aria-label={`${actionLabel} ${contest.name} contest`}
        className={cn(
          "group/footer flex items-center gap-3 border-t p-2 transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
          contestListFooterClass(contest, variant),
          pastAction
            ? "hover:bg-slate-100 focus-visible:outline-blue-500"
            : "hover:bg-emerald-50 focus-visible:outline-emerald-600",
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
        <span className={cn(ctaBaseClassName, pastAction ? ctaPastClassName : ctaJoinClassName)}>
          {actionLabel}
          <ChevronRightIcon className="-ml-0.5 h-4 w-4 shrink-0" aria-hidden />
        </span>
      </Link>
    </div>
  );
};
