import React from "react";
import { cn } from "../../lib/tabStyles";

export interface StatsPanelEntryProps {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}

export const StatsPanelEntry: React.FC<StatsPanelEntryProps> = ({ label, value, compact }) => (
  <div
    className={cn(
      "rounded-md border border-gray-300/90 bg-gradient-to-b from-white to-gray-200 text-center shadow-sm ring-1 ring-inset ring-white/60",
      compact ? "min-w-[3.25rem] shrink-0 px-2 py-1" : "min-w-[3.75rem] flex-1 p-2",
    )}
  >
    <div
      className={cn(
        "font-display font-bold leading-none tabular-nums text-gray-900",
        compact ? "text-base" : "text-2xl",
      )}
    >
      {value}
    </div>
    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none text-gray-500">
      {label}
    </div>
  </div>
);

export interface StatsPanelProps {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const StatsPanel: React.FC<StatsPanelProps> & {
  Entry: typeof StatsPanelEntry;
} = ({ children, className, compact }) => (
  <div className={cn("flex", compact ? "gap-2" : "gap-3", className)}>{children}</div>
);

StatsPanel.Entry = StatsPanelEntry;
