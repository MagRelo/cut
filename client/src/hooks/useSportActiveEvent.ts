import { useMemo } from "react";
import type { Candidate } from "@cut/sport-sdk";
import type { ActiveEventResponse, EventStatus } from "../types/event";
import {
  eventDisplayNameFromMetadata,
  eventStartDateFromMetadata,
  eventStatusDisplayFromMetadata,
  isEventEditableFromActiveStatus,
  roundDisplayFromMetadata,
  roundStatusDisplayFromMetadata,
} from "../lib/eventMetadata";
import { useActiveEventQuery, useEventCandidatesQuery } from "./useSportData";

export interface SportActiveEventState {
  activeEvent: ActiveEventResponse | null;
  event: ActiveEventResponse["event"] | null;
  sport: ActiveEventResponse["sport"] | null;
  status: EventStatus | null;
  candidates: Candidate[];
  eventId: string | undefined;
  sportId: string;
  eventName: string | null;
  metadata: unknown;
  roundDisplay: string | null;
  roundStatusDisplay: string | null;
  eventStartDate: string | null;
  isEventEditable: boolean;
  eventStatusDisplay: string;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/** Sport-scoped active event — sportId is required; no implicit default. */
export function useSportActiveEvent(sportId: string): SportActiveEventState {
  const activeQuery = useActiveEventQuery(sportId);
  const eventId = activeQuery.data?.event.id;
  const candidatesQuery = useEventCandidatesQuery(sportId, eventId);

  const metadata = activeQuery.data?.event.metadata ?? null;
  const status = activeQuery.data?.status ?? null;

  const isEventEditable = useMemo(() => {
    if (!activeQuery.data || !status) return false;
    return isEventEditableFromActiveStatus(status, metadata);
  }, [activeQuery.data, metadata, status]);

  const eventStatusDisplay = useMemo(
    () => eventStatusDisplayFromMetadata(metadata),
    [metadata],
  );

  const isLoading = activeQuery.isLoading || (Boolean(eventId) && candidatesQuery.isLoading);
  const isFetching = activeQuery.isFetching || candidatesQuery.isFetching;

  const rawError = activeQuery.error ?? candidatesQuery.error;
  const error =
    rawError instanceof Error ? rawError : rawError ? new Error("Failed to load event") : null;

  const refetch = async () => {
    await Promise.all([activeQuery.refetch(), candidatesQuery.refetch()]);
  };

  return {
    activeEvent: activeQuery.data ?? null,
    event: activeQuery.data?.event ?? null,
    sport: activeQuery.data?.sport ?? null,
    status,
    candidates: candidatesQuery.data ?? [],
    eventId,
    sportId,
    metadata,
    eventName: eventDisplayNameFromMetadata(metadata, ""),
    roundDisplay: roundDisplayFromMetadata(metadata),
    roundStatusDisplay: roundStatusDisplayFromMetadata(metadata),
    eventStartDate: eventStartDateFromMetadata(metadata),
    isEventEditable,
    eventStatusDisplay,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
