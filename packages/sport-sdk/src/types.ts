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

export type PopularityMode = "multiplicative" | "additive";

export interface PopularityRules {
  /** 0 = off. Positive rewards low-owned picks; negative rewards high-owned picks. */
  weight: number;
  /** Amplitude scaler. Default: 1. */
  strength?: number;
  /** Max raw bonus weight before bonus-shift floor. Default: 2. */
  cap?: number;
  /** How bonus applies to positive pick scores. Default: "multiplicative". */
  mode?: PopularityMode;
  /** Min contest entries before pick rates are computed. Default: 5. */
  minEntryFloor?: number;
}

export interface ScoringRules {
  aggregation: ScoringAggregation;
  direction: ScoringDirection;
  popularity?: PopularityRules;
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
