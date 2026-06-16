import { useMemo } from "react";
import type { EventStatus } from "../types/event";
import { useEventCandidatesQuery } from "./useSportData";

function eventStatusFromMetadata(metadata: unknown): EventStatus {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "SCHEDULED";
  }
  const status = (metadata as { status?: string }).status?.toUpperCase();
  if (status === "IN_PROGRESS") return "LIVE";
  if (status === "COMPLETE" || status === "OFFICIAL") return "COMPLETE";
  return "SCHEDULED";
}

export function useEventFieldLeaderboard(
  sportId: string | undefined,
  eventId: string | undefined,
  eventMetadata?: unknown,
) {
  const candidatesQuery = useEventCandidatesQuery(sportId, eventId);

  const status = useMemo(
    () => eventStatusFromMetadata(eventMetadata),
    [eventMetadata],
  );

  const rawError = candidatesQuery.error;
  const error =
    rawError instanceof Error ? rawError : rawError ? new Error("Failed to load leaderboard") : null;

  return {
    status,
    candidates: candidatesQuery.data ?? [],
    isLoading: candidatesQuery.isLoading,
    error,
  };
}
