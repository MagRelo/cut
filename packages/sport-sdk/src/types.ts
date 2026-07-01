export type EventStatus = "SCHEDULED" | "LIVE" | "COMPLETE";

export type ScoringAggregation = "sum";
export type ScoringDirection = "higher_wins" | "lower_wins";

import type { PredictionRules } from "./lineupPrediction.js";
import type { PeriodRules } from "./periods.js";
export type { PredictionRules, PeriodRules };

export interface RosterRules {
  slotCount: number;
  minPicks: number;
  maxPicks: number;
  allowDuplicates: boolean;
}

export interface ScoringRules {
  aggregation: ScoringAggregation;
  direction: ScoringDirection;
}

export interface SportSummary {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  rosterRules: RosterRules;
  scoringRules: ScoringRules;
  predictionRules: PredictionRules;
  periodRules?: PeriodRules | null;
}

export interface Candidate {
  eventParticipantId: string;
  participantId: string;
  displayName: string;
  sortKeys: Record<string, number | string>;
  metadata: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LineupEntryInput {
  entryId: string;
  score: number | null;
  prediction: unknown | null;
  createdAt: Date;
}

export interface RankedEntry {
  entryId: string;
  score: number;
  position: number;
  predictionDistance: number;
  createdAt: Date;
}

/** Basis points per winning entry (e.g. [7000, 2000, 1000]). */
export type PayoutVector = number[];

export interface CompetitionEventShell {
  id: string;
  sportId: string;
  externalId: string;
  isActive: boolean;
  metadata: unknown;
}

export interface LineupPickShell {
  id: string;
  eventParticipantId: string;
  slotIndex: number;
  metadata?: unknown;
}

export type PropBetGrade = "WON" | "LOST" | "VOID";

export interface PropBetTicketShell {
  id: string;
  lineupId: string;
  metadata: unknown;
}

export interface PropBetResultsShell {
  eventId: string;
  metadata: unknown;
}

export interface MarketSnapshot {
  lineupId: string;
  capturedAt: Date;
  metadata: unknown;
}
