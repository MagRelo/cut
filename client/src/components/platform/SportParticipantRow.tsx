import React from "react";
import type { Candidate, EventStatus } from "@cut/sport-sdk";
import { useActiveEvent } from "../../hooks/useActiveEvent";
import { useRequiredSportUIPlugin } from "../../hooks/useSportUI";

interface SportParticipantRowProps {
  candidate: Candidate;
  status?: EventStatus;
  onClick?: () => void;
  ownershipPercentage?: number;
}

export const SportParticipantRow: React.FC<SportParticipantRowProps> = ({
  candidate,
  status,
  onClick,
  ownershipPercentage,
}) => {
  const plugin = useRequiredSportUIPlugin();
  const { status: eventStatus } = useActiveEvent();
  const ParticipantRow = plugin.ParticipantRow;
  const resolvedStatus = status ?? eventStatus ?? "SCHEDULED";

  return (
    <ParticipantRow
      candidate={candidate}
      status={resolvedStatus}
      onClick={onClick}
      ownershipPercentage={ownershipPercentage}
    />
  );
};
