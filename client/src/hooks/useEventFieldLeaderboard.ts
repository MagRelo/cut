import { useMemo } from "react";
import { eventStatusFromMetadata } from "../lib/eventMetadata";
import { useEventCandidatesQuery } from "./useSportData";

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
