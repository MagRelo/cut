import React, { useState } from "react";
import { TournamentSummaryModal } from "./TournamentSummaryModal";
import { useActiveEvent } from "../../hooks/useActiveEvent";

export const TournamentInfoPanel: React.FC = () => {
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const { eventName } = useActiveEvent();

  if (!eventName) return null;

  return (
    <>
      <div className="text-sm text-gray-700 flex flex-wrap items-center gap-1">
        <span className="font-display ">Tournament Preview: </span>
        <button
          type="button"
          onClick={() => setIsSummaryOpen(true)}
          className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded border border-blue-500 transition-colors text-sm font-display ml-1"
        >
          {eventName}
        </button>
      </div>
      <TournamentSummaryModal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} />
    </>
  );
};
