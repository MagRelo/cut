import { useMemo } from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import type { Contest } from "../types/contest";
import type { EventStatus } from "../types/event";
import {
  eventDisplayNameFromMetadata,
  isEventEditableStatus,
  periodDisplayFromMetadata,
  periodStatusDisplayFromMetadata,
} from "../lib/eventMetadata";
import {
  eventStartForSport,
  eventStatusForSport,
  eventStatusLabelForSport,
} from "../sports/eventPresentation";
import { currentPeriodFromMetadata } from "../lib/eventPeriods";

export interface ContestEventState {
  sportId: string | undefined;
  eventId: string;
  eventShell: CompetitionEventShell | null;
  metadata: unknown;
  status: EventStatus;
  isEventEditable: boolean;
  eventName: string | null;
  currentPeriod: number | null;
  periodDisplay: string | null;
  periodStatusDisplay: string | null;
  eventStartDate: string | null;
  eventStatusDisplay: string;
  error: Error | null;
}

const MISSING_EVENT_ERROR = new Error("Contest missing event data");

function toEventShell(contest: Contest): CompetitionEventShell | null {
  const event = contest.event;
  if (!event?.sportId) return null;
  return {
    id: event.id,
    sportId: event.sportId,
    externalId: event.externalId,
    isActive: event.isActive,
    metadata: event.metadata,
  };
}

/** Contest-scoped event shell — no field roster. */
export function useContestEvent(contest: Contest | undefined): ContestEventState {
  const eventShell = useMemo(() => (contest ? toEventShell(contest) : null), [contest]);
  const sportId = contest?.event?.sportId;
  const eventId = contest?.eventId ?? "";
  const metadata = contest?.event?.metadata ?? null;

  const status = useMemo(() => eventStatusForSport(sportId, metadata), [sportId, metadata]);

  return {
    sportId,
    eventId,
    eventShell,
    metadata,
    status,
    isEventEditable: isEventEditableStatus(status),
    eventName: eventDisplayNameFromMetadata(metadata, ""),
    currentPeriod: currentPeriodFromMetadata(metadata),
    periodDisplay: periodDisplayFromMetadata(metadata),
    periodStatusDisplay: periodStatusDisplayFromMetadata(metadata),
    eventStartDate: eventStartForSport(sportId, metadata),
    eventStatusDisplay: eventStatusLabelForSport(sportId, metadata),
    error: eventShell ? null : MISSING_EVENT_ERROR,
  };
}
