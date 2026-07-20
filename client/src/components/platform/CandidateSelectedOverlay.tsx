import React from "react";
import { CheckIcon } from "@heroicons/react/24/solid";

export const CandidateSelectedOverlay: React.FC = () => (
  <div
    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-sm"
    aria-hidden
  >
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 shadow-lg ring-2 ring-white/80">
      <CheckIcon className="h-6 w-6 text-white" />
    </div>
  </div>
);
