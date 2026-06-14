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
  name: string;
  prediction: unknown;
  picks: PlatformLineupPick[];
  createdAt: string;
  updatedAt: string;
  contestLineups?: import("./lineup").ContestLineupWithContest[];
}
