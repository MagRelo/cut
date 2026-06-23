import React from "react";
import type { Candidate, EventStatus } from "@cut/sport-sdk";
import { useOptionalEventScope } from "../../contexts/EventScopeContext";
import { useRequiredSportUIPlugin } from "../../hooks/useSportUI";

interface SportParticipantRowProps {
  candidate: Candidate;
  status: EventStatus;
  sportId?: string;
  onClick?: () => void;
  ownershipPercentage?: number;
  eventMetadata?: unknown;
}

export const SportParticipantRow: React.FC<SportParticipantRowProps> = ({
  candidate,
  status,
  sportId,
  onClick,
  ownershipPercentage,
  eventMetadata,
}) => {
  const plugin = useRequiredSportUIPlugin(sportId);
  const scope = useOptionalEventScope();
  const ParticipantRow = plugin.ParticipantRow;

  return (
    <ParticipantRow
      candidate={candidate}
      status={status}
      onClick={onClick}
      ownershipPercentage={ownershipPercentage}
      eventMetadata={eventMetadata ?? scope?.metadata}
    />
  );
};
