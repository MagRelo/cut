import React from "react";
import type { SideBetTicketsVisualState } from "./resolveSideBetTicketsState";
import { SideBetTicketCard } from "./SideBetTicketCard";

export interface SideBetTicketsListProps {
  state: Exclude<SideBetTicketsVisualState, { kind: "hidden" }>;
  borderColor: string;
  userLabel: string;
  lineupNumberLabel: string | null;
}

export const SideBetTicketsList: React.FC<SideBetTicketsListProps> = ({
  state,
  borderColor,
  userLabel,
  lineupNumberLabel,
}) => {
  if (state.kind === "loading") {
    return <p className="font-display text-sm text-gray-500">Loading your parlays…</p>;
  }

  if (state.kind === "error") {
    return (
      <p className="mb-2 rounded-sm border border-red-200 bg-red-50 p-2 font-display text-sm text-red-700">
        {state.message}
      </p>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="p-4 text-center">
        <p className="font-display text-sm text-gray-400">No parlays yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {state.tickets.map((ticket) => (
        <SideBetTicketCard
          key={ticket.id}
          ticket={ticket}
          borderColor={borderColor}
          userLabel={userLabel}
          lineupNumberLabel={lineupNumberLabel}
        />
      ))}
    </div>
  );
};
