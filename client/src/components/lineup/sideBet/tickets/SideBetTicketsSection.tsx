import React from "react";
import { useSideBetTicketsForLineupQuery } from "../../../../hooks/useSideBetQueries";
import { resolveSideBetTicketsState } from "./resolveSideBetTicketsState";
import { SideBetTicketsList } from "./SideBetTicketsList";

export interface SideBetTicketsSectionProps {
  lineupId: string | null;
  borderColor: string;
  userLabel: string;
  lineupNumberLabel: string | null;
}

export const SideBetTicketsSection: React.FC<SideBetTicketsSectionProps> = ({
  lineupId,
  borderColor,
  userLabel,
  lineupNumberLabel,
}) => {
  const ticketsQuery = useSideBetTicketsForLineupQuery(lineupId);
  const ticketsState = resolveSideBetTicketsState(lineupId, ticketsQuery);

  if (!lineupId || ticketsState.kind === "hidden") return null;

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <h4 className="mb-2 font-display text-base font-semibold text-gray-900">Your parlays</h4>
      <SideBetTicketsList
        state={ticketsState}
        borderColor={borderColor}
        userLabel={userLabel}
        lineupNumberLabel={lineupNumberLabel}
      />
    </div>
  );
};
