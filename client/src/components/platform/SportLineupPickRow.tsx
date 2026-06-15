import React from "react";
import type { Candidate } from "@cut/sport-sdk";
import { SportParticipantRow } from "./SportParticipantRow";

interface SportLineupPickRowProps {
  candidate: Candidate;
  onClick?: () => void;
}

export const SportLineupPickRow: React.FC<SportLineupPickRowProps> = ({ candidate, onClick }) => {
  return <SportParticipantRow candidate={candidate} onClick={onClick} />;
};
