import { useMemo } from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import type { Contest } from "../types/contest";
import type { EventStatus } from "../types/event";
import {
  eventDisplayNameFromMetadata,
  eventStartDateFromMetadata,
  eventStatusDisplayFromMetadata,
  eventStatusFromMetadata,
  isEventEditableFromMetadata,
  periodDisplayFromMetadata,
  periodStatusDisplayFromMetadata,
} from "../lib/eventMetadata";
import { currentPeriodFromMetadata } from "../lib/eventPeriods";
import { useEventCandidatesQuery } from "./useSportData";

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
  candidates: ReturnType<typeof useEventCandidatesQuery>["data"];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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

/** Contest-scoped event — requires contest.event; no SportContext fallback. */
export function useContestEvent(contest: Contest | undefined): ContestEventState {
  const eventShell = useMemo(() => (contest ? toEventShell(contest) : null), [contest]);
  const sportId = contest?.event?.sportId;
  const eventId = contest?.eventId ?? "";
  const metadata = contest?.event?.metadata ?? null;

  const candidatesQuery = useEventCandidatesQuery(sportId, eventId || undefined);

  const status = useMemo(() => eventStatusFromMetadata(metadata), [metadata]);

  const scopeError = !eventShell ? MISSING_EVENT_ERROR : null;
  const queryError = candidatesQuery.error;
  const error =
    scopeError ??
    (queryError instanceof Error
      ? queryError
      : queryError
        ? new Error("Failed to load event")
        : null);

  const refetch = async () => {
    await candidatesQuery.refetch();
  };

  return {
    sportId,
    eventId,
    eventShell,
    metadata,
    status,
    isEventEditable: isEventEditableFromMetadata(metadata),
    eventName: eventDisplayNameFromMetadata(metadata, ""),
    currentPeriod: currentPeriodFromMetadata(metadata),
    periodDisplay: periodDisplayFromMetadata(metadata),
    periodStatusDisplay: periodStatusDisplayFromMetadata(metadata),
    eventStartDate: eventStartDateFromMetadata(metadata),
    eventStatusDisplay: eventStatusDisplayFromMetadata(metadata),
    candidates: candidatesQuery.data ?? [],
    isLoading: Boolean(sportId && candidatesQuery.isLoading),
    isFetching: candidatesQuery.isFetching,
    error,
    refetch,
  };
}
