import { useMemo } from "react";
import { eventStatusForSport } from "../sports/eventPresentation";
import { useEventCandidatesQuery } from "./useSportData";

export function useEventFieldLeaderboard(
  sportId: string | undefined,
  eventId: string | undefined,
  eventMetadata?: unknown,
) {
  const candidatesQuery = useEventCandidatesQuery(sportId, eventId);

  const status = useMemo(
    () => eventStatusForSport(sportId, eventMetadata),
    [sportId, eventMetadata],
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
