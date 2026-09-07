import React from "react";
import { cn } from "../../lib/tabStyles";

export type ListHeaderTone = "default" | "upcoming" | "live" | "past";

interface ListHeaderProps {
  title: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  tone?: ListHeaderTone;
}

const toneChipClassName: Record<Exclude<ListHeaderTone, "past">, string> = {
  default:
    "rounded-full bg-gradient-to-b from-slate-100 to-slate-200/80 px-3 py-1 font-display text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-300/80",
  upcoming:
    "rounded-full bg-emerald-600 px-3 py-1 font-display text-sm font-semibold text-white shadow-sm shadow-emerald-700/25",
  live: "rounded-full bg-emerald-50 px-3 py-1 font-display text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200",
};

export const ListHeader: React.FC<ListHeaderProps> = ({
  title,
  className = "",
  actions,
  tone = "default",
}) => {
  const titleClassName =
    tone === "past"
      ? "inline-flex max-w-full items-center gap-1.5 truncate font-display text-sm font-semibold uppercase tracking-wider text-slate-500"
      : cn("inline-flex max-w-full items-center gap-1.5 truncate", toneChipClassName[tone]);

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <h2 className="m-0 min-w-0 max-w-full">
        <span className={titleClassName}>{title}</span>
      </h2>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
};
