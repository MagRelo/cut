import { Link } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { cn } from "../../lib/tabStyles";
import { ContestCard } from "./ContestCard";

const viewButtonClassName =
  "inline-flex min-w-[88px] items-center justify-center gap-1 rounded border border-blue-500 bg-blue-500 px-4 py-1.5 font-display text-sm text-white transition-colors hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

function formatBuyInValue(primaryDeposit: number | undefined): string {
  if (primaryDeposit === 0) return "Free";
  if (primaryDeposit != null) return `$${primaryDeposit}`;
  return "—";
}

function ContestListStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="w-20 shrink-0 text-center">
      <div className="font-display text-xl font-bold tabular-nums leading-none text-gray-900">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
        {label}
      </div>
    </div>
  );
}

interface ContestListItemProps {
  contest: Contest;
  to: string;
  className?: string;
}

export const ContestListItem = ({ contest, to, className }: ContestListItemProps) => {
  const entryCount = contest.contestLineups?.length ?? 0;
  const buyInValue = formatBuyInValue(contest.settings?.primaryDeposit);

  return (
    <div
      className={cn(
        "group min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition-[border-color,box-shadow] duration-200 hover:border-blue-200 hover:shadow-md",
        className,
      )}
    >
      <div className="p-3 py-4">
        <ContestCard contest={contest} />
      </div>
      <div className="gap-4px-3 flex items-center justify-between px-3 pb-2.5">
        <div className="flex items-center gap-4">
          <ContestListStat value={buyInValue} label="Buy-in" />
          <ContestListStat value={entryCount} label="Entries" />
        </div>
        <Link to={to} aria-label={`View ${contest.name} contest`} className={viewButtonClassName}>
          View
          <ChevronRightIcon className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </div>
    </div>
  );
};
