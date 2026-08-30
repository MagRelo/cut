import React from "react";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { LINEUP_SLOT_SHELL_CLASSNAME } from "./LineupSlotShell";

/** Circular spinner in the player-avatar slot while candidates are still loading. */
export const LineupPlayerSlotLoading: React.FC = () => {
  return (
    <div className={LINEUP_SLOT_SHELL_CLASSNAME} role="status" aria-label="Loading player">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
        <LoadingSpinnerSmall color="gray" />
      </div>
      <div className="min-w-0 flex-1" aria-hidden>
        <div className="h-4 w-36 max-w-[70%] rounded bg-slate-200" />
        <div className="mt-1.5 h-3 w-20 rounded bg-slate-100" />
      </div>
    </div>
  );
};
