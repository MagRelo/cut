import type { ComponentType } from "react";
import type { CandidateSortConfig } from "./candidateSort.js";
import type { Candidate, CompetitionEventShell, EventStatus } from "./types.js";

export interface PredictionFieldProps {
  value: unknown;
  onChange?: (value: unknown) => void;
  disabled?: boolean;
  error?: string | null;
  readOnly?: boolean;
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

export type EventSummarySurface = "hero" | "content";

export interface EventSummaryProps {
  event: CompetitionEventShell;
  /** `hero` = image + tint (default); `content` = text only for embedding in a parent surface. */
  surface?: EventSummarySurface;
}

export interface SportUIPlugin {
  CandidateRow: ComponentType<CandidateRowProps>;
  ParticipantRow: ComponentType<ParticipantRowProps>;
  ParticipantDetail: ComponentType<ParticipantDetailProps>;
  PredictionField?: ComponentType<PredictionFieldProps>;
  EventSummary?: ComponentType<EventSummaryProps>;
  resolveEventHeroImage?: (event: CompetitionEventShell) => string | null;
  /** Optional Tailwind classes for hero background positioning (e.g. object-position). */
  eventHeroImageClassName?: string;
  candidateSortConfig: CandidateSortConfig;
}
