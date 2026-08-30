import React from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

interface CandidateSaveOverlayProps {
  isSaved: boolean;
}

/** Dims a picker card and shows Saving / Saved on the pick in flight. */
export const CandidateSaveOverlay: React.FC<CandidateSaveOverlayProps> = ({ isSaved }) => (
  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-1.5 rounded-sm bg-slate-900/60">
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg ring-2 ${
        isSaved ? "bg-emerald-600 ring-white/80" : "bg-white ring-blue-500"
      }`}
    >
      {isSaved ? (
        <CheckIcon className="h-6 w-6 text-white" aria-hidden />
      ) : (
        <LoadingSpinnerSmall color="blue" className="h-6 w-6" />
      )}
    </div>
    <span className="font-display text-sm font-medium text-white">
      {isSaved ? "Saved!" : "Saving..."}
    </span>
  </div>
);
