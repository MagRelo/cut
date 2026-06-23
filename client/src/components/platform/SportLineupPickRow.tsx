import React from "react";
import type { Candidate, EventStatus } from "@cut/sport-sdk";
import { SportParticipantRow } from "./SportParticipantRow";

interface SportLineupPickRowProps {
  candidate: Candidate;
  status: EventStatus;
  eventMetadata?: unknown;
  onClick?: () => void;
}

export const SportLineupPickRow: React.FC<SportLineupPickRowProps> = ({
  candidate,
  status,
  eventMetadata,
  onClick,
}) => {
  return (
    <SportParticipantRow
      candidate={candidate}
      status={status}
      eventMetadata={eventMetadata}
      onClick={onClick}
    />
  );
};
