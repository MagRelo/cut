import React from "react";
import type { Candidate, EventStatus } from "@cut/sport-sdk";
import { SportParticipantRow } from "./SportParticipantRow";

interface SportLineupPickRowProps {
  candidate: Candidate;
  status: EventStatus;
  eventMetadata?: unknown;
  onClick?: () => void;
  /** Post-lock popularity bonus for this pick in the contest. Shown only when > 0. */
  popularityBonus?: number | null;
}

export const SportLineupPickRow: React.FC<SportLineupPickRowProps> = ({
  candidate,
  status,
  eventMetadata,
  onClick,
  popularityBonus,
}) => {
  const showBonus = popularityBonus != null && popularityBonus > 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <SportParticipantRow
          candidate={candidate}
          status={status}
          eventMetadata={eventMetadata}
          onClick={onClick}
        />
      </div>
      {showBonus ? (
        <div
          className="shrink-0 text-right font-display"
          title="Popularity bonus"
        >
          <div className="text-sm font-semibold tabular-nums leading-none text-emerald-700">
            +{popularityBonus}
          </div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-600/80">
            Bonus
          </div>
        </div>
      ) : null}
    </div>
  );
};
