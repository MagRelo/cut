import type { SportSummary } from "@cut/sport-sdk";

export type EventStatus = "SCHEDULED" | "LIVE" | "COMPLETE";

export interface CompetitionEvent {
  id: string;
  sportId: string;
  externalId: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveEventResponse {
  sport: SportSummary;
  event: CompetitionEvent;
  status: EventStatus;
}

export interface PlatformLineupPick {
  id: string;
  slotIndex: number | null;
  eventParticipantId: string;
  participant: {
    id: string;
    displayName: string | null;
    externalId: string | null;
    metadata: unknown;
  } | null;
  scoreData: unknown;
  total: number | null;
}

export interface PlatformLineup {
  id: string;
  eventId: string;
  contestId?: string | null;
  name: string;
  prediction: unknown;
  picks: PlatformLineupPick[];
  /** Sum of pick totals — maintained by the server on each lineup fetch. */
  score: number;
  createdAt: string;
  updatedAt: string;
  contestLineups?: import("./lineup").ContestLineupWithContest[];
}
