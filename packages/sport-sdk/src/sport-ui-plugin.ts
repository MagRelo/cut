import type { ComponentType } from "react";
import type { Candidate, CompetitionEventShell, EventStatus } from "./types.js";

export interface PredictionFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  error?: string | null;
}

export interface CandidateRowProps {
  candidate: Candidate;
  onSelect?: () => void;
  isSelected?: boolean;
  disabled?: boolean;
  status?: EventStatus;
  eventMetadata?: unknown;
}

export interface ParticipantRowProps {
  candidate: Candidate;
  status: EventStatus;
  onClick?: () => void;
  ownershipPercentage?: number;
  eventMetadata?: unknown;
}

export interface ParticipantDetailProps {
  candidate: Candidate;
  status: EventStatus;
  /** Icon beside PTS in the header row: scorecard (default in lists) or share (detail modal default). */
  rowTrailing?: "scorecard" | "share";
  onShare?: () => void;
  eventMetadata?: unknown;
}

export interface SportUIPlugin {
  CandidateRow: ComponentType<CandidateRowProps>;
  ParticipantRow: ComponentType<ParticipantRowProps>;
  ParticipantDetail: ComponentType<ParticipantDetailProps>;
  PredictionField?: ComponentType<PredictionFieldProps>;
  EventSummary?: ComponentType<{ event: CompetitionEventShell }>;
}
