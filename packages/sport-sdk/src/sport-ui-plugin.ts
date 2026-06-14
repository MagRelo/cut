import type { ComponentType } from "react";
import type { Candidate, CompetitionEventShell, LineupPickShell } from "./types.js";

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
}

export interface SportUIPlugin {
  CandidateRow: ComponentType<CandidateRowProps>;
  PickDetail: ComponentType<{ pick: LineupPickShell }>;
  PredictionField?: ComponentType<PredictionFieldProps>;
  EventSummary?: ComponentType<{ event: CompetitionEventShell }>;
}
