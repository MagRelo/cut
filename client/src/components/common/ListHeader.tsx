import React from "react";
import { cn } from "../../lib/tabStyles";

export type ListHeaderTone = "default" | "upcoming" | "live" | "past";

interface ListHeaderProps {
  title: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  tone?: ListHeaderTone;
}

const defaultChipClassName =
  "rounded-full bg-gradient-to-b from-slate-100 to-slate-200/80 px-3 py-1 font-display text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-300/80";

const titleToneClassName =
  "inline-flex max-w-full items-center gap-1.5 truncate font-display text-sm font-semibold uppercase tracking-wider text-slate-900";

export const ListHeader: React.FC<ListHeaderProps> = ({
  title,
  className = "",
  actions,
  tone = "default",
}) => {
  const titleClassName =
    tone === "default"
      ? cn("inline-flex max-w-full items-center gap-1.5 truncate", defaultChipClassName)
      : titleToneClassName;

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <h2 className="m-0 min-w-0 max-w-full">
        <span className={titleClassName}>{title}</span>
      </h2>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
};
