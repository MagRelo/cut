import React from "react";
import { UserIcon } from "@heroicons/react/24/outline";

/** Fixed slot height so empty, loading, and filled picks do not shift the lineup. */
export const LINEUP_SLOT_SHELL_CLASSNAME =
  "flex h-12 items-center justify-between gap-3 overflow-hidden";

export const LineupSlotShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className={LINEUP_SLOT_SHELL_CLASSNAME}>{children}</div>;
};

export const LineupEmptySlotLabel: React.FC = () => {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
        <UserIcon className="h-6 w-6 text-slate-300" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block truncate text-md font-semibold leading-tight text-slate-400">
          No selection
        </span>
        <span className="block truncate text-xs leading-tight text-slate-400">Add a player</span>
      </span>
    </span>
  );
};
