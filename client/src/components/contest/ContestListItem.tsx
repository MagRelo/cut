import type { ReactNode } from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { useContestPotDisplay } from "../../hooks/useContestPotDisplay";
import { cn } from "../../lib/tabStyles";

interface ContestListItemProps {
  contest: Contest;
  className?: string;
}

function contestLineupCount(contest: Contest): number | null {
  if (contest._count?.contestLineups != null) return contest._count.contestLineups;
  if (contest.contestLineups) return contest.contestLineups.length;
  return null;
}

function formatBuyIn(primaryDeposit: number | undefined): string {
  if (primaryDeposit === 0) return "Free";
  if (primaryDeposit != null) return `$${primaryDeposit}`;
  return "—";
}

function ListStatTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 flex-1 rounded border border-gray-300/90 bg-gradient-to-b from-white to-gray-200 px-2 py-2 text-center shadow-sm ring-1 ring-inset ring-white/60">
      <div
        className={cn(
          "font-display text-sm font-bold leading-none tabular-nums text-gray-900",
          valueClassName,
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none text-gray-500">
        {label}
      </div>
    </div>
  );
}

export const ContestListItem = ({ contest, className }: ContestListItemProps) => {
  const { displayPot, showLoading, showPotUnavailable } = useContestPotDisplay(contest);
  const lineupCount = contestLineupCount(contest);
  const potValue = showLoading ? "..." : showPotUnavailable ? "—" : `$${displayPot}`;

  return (
    <div
      className={cn(
        "rounded-md border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]",
        className,
      )}
    >
      <div className="space-y-1">
        <h3 className="font-display text-xl font-bold leading-snug text-gray-900 sm:text-2xl">
          {contest.name}
        </h3>
        {contest.userGroup?.name ? (
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-emerald-600">
            <UserGroupIcon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{contest.userGroup.name}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <ListStatTile label="Buy-in" value={formatBuyIn(contest.settings?.primaryDeposit)} />
        <ListStatTile label="Lineups" value={lineupCount != null ? lineupCount : "—"} />
        <ListStatTile label="Pot" value={potValue} valueClassName="text-emerald-600" />
      </div>
    </div>
  );
};
