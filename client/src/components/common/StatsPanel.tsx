import React from "react";
import { cn } from "../../lib/tabStyles";

export interface StatsPanelEntryProps {
  label: string;
  value: React.ReactNode;
}

export const StatsPanelEntry: React.FC<StatsPanelEntryProps> = ({ label, value }) => (
  <div className="min-w-[3.75rem] flex-1 rounded-md border border-gray-300/90 bg-gradient-to-b from-white to-gray-200 p-2 text-center shadow-sm ring-1 ring-inset ring-white/60">
    <div className="font-display text-2xl font-bold leading-none tabular-nums text-gray-900">{value}</div>
    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide leading-none text-gray-500">
      {label}
    </div>
  </div>
);

export interface StatsPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const StatsPanel: React.FC<StatsPanelProps> & {
  Entry: typeof StatsPanelEntry;
} = ({ children, className }) => (
  <div className={cn("flex gap-3", className)}>{children}</div>
);

StatsPanel.Entry = StatsPanelEntry;
