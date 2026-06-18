import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { type Contest } from "../../types/contest";
import { cn } from "../../lib/tabStyles";
import { ContestCard } from "./ContestCard";

interface ContestListItemProps {
  contest: Contest;
  className?: string;
}

export const ContestListItem = ({ contest, className }: ContestListItemProps) => {
  return (
    <div
      className={cn(
        "flex min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition-[border-color,box-shadow,background-color] duration-200 group-hover:border-blue-200 group-hover:bg-blue-50/40 group-hover:shadow-md",
        className,
      )}
    >
      <div className="min-w-0 flex-1 p-3 py-4">
        <ContestCard contest={contest} />
      </div>
      <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 border-l border-slate-50 bg-gradient-to-b from-slate-50/90 to-white px-2 text-blue-600 transition-colors duration-200 group-hover:border-blue-50 group-hover:bg-blue-100/60 group-hover:text-blue-700">
        <ChevronRightIcon className="h-5 w-5 shrink-0" aria-hidden />
        <span className="font-display text-[10px] font-semibold uppercase leading-none tracking-wide">
          View
        </span>
      </div>
    </div>
  );
};
