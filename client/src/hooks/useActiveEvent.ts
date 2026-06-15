import { useMemo } from "react";
import type { Candidate } from "@cut/sport-sdk";
import { useSportContext } from "../contexts/SportContext";
import type { ActiveEventResponse, EventStatus } from "../types/event";
import { useActiveEventQuery, useEventCandidatesQuery } from "./useSportData";

type GolfEventMetadata = {
  name?: string;
  status?: string;
  roundDisplay?: string | null;
  roundStatusDisplay?: string | null;
  currentRound?: number | null;
  startDate?: string;
};

function formatEventStatusDisplay(status: string | undefined): string {
  return (
    status
      ?.split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ") ?? ""
  );
}

function isEventEditable(
  platformStatus: EventStatus | undefined,
  metaStatus: string | undefined,
): boolean {
  if (platformStatus === "LIVE" || platformStatus === "COMPLETE") {
    return false;
  }
  const upper = metaStatus?.toUpperCase();
  if (upper === "IN_PROGRESS" || upper === "COMPLETE" || upper === "OFFICIAL") {
    return false;
  }
  return true;
}

export interface ActiveEventState {
  activeEvent: ActiveEventResponse | null;
  event: ActiveEventResponse["event"] | null;
  status: EventStatus | null;
  candidates: Candidate[];
  eventId: string | undefined;
  sportId: string;
  eventName: string | null;
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

/** Primary hook for active sport event — platform types, no legacy adapter. */
export function useActiveEvent(): ActiveEventState {
  const { sportId } = useSportContext();
  const activeQuery = useActiveEventQuery(sportId);
  const eventId = activeQuery.data?.event.id;
  const candidatesQuery = useEventCandidatesQuery(sportId, eventId);

  const metadata = (activeQuery.data?.event.metadata ?? {}) as GolfEventMetadata;

  const isEventEditableValue = useMemo(() => {
    if (!activeQuery.data) return false;
    return isEventEditable(activeQuery.data.status, metadata.status);
  }, [activeQuery.data, metadata.status]);

  const eventStatusDisplay = useMemo(
    () => formatEventStatusDisplay(metadata.status ?? activeQuery.data?.status),
    [metadata.status, activeQuery.data?.status],
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
    status: activeQuery.data?.status ?? null,
    candidates: candidatesQuery.data ?? [],
    eventId,
    sportId,
    eventName: metadata.name ?? null,
    roundDisplay: metadata.roundDisplay ?? null,
    roundStatusDisplay: metadata.roundStatusDisplay ?? null,
    eventStartDate: metadata.startDate ?? null,
    isEventEditable: isEventEditableValue,
    eventStatusDisplay,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
