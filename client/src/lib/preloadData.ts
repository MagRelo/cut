import type { QueryClient } from "@tanstack/react-query";
import type { ContestDirectoryResponse } from "../types/contest";
import type { PlatformLineupListItem } from "../types/lineup";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";
import {
  contestDirectoryQueryKey,
  contestDirectoryStaleMs,
  fetchContestDirectory,
} from "./contestDirectoryQuery";
import { SERVER_SYNC_INTERVAL_MS } from "./queryTiming";

interface LineupsResponse {
  lineups: PlatformLineupListItem[];
}

/**
 * Extracts unique event IDs from the contest directory.
 * Focuses on upcoming and live events where users are most likely to interact.
 */
function extractEventIdsFromDirectory(directory: ContestDirectoryResponse): string[] {
  const eventIds = new Set<string>();

  for (const group of directory.upcoming) {
    eventIds.add(group.event.id);
  }
  for (const group of directory.live) {
    eventIds.add(group.event.id);
  }

  return Array.from(eventIds);
}

/**
 * Preloads lineup data for active events.
 * Called after user authentication to warm the cache before users navigate to contests.
 * Reuses the same directory query key as `useContestDirectory` (dedupes in-flight fetches).
 */
export async function preloadLineups(queryClient: QueryClient, userId: string): Promise<void> {
  try {
    const directoryKey = contestDirectoryQueryKey("all", userId);
    const directory = await queryClient.fetchQuery({
      queryKey: directoryKey,
      queryFn: () => fetchContestDirectory("all"),
      staleTime: contestDirectoryStaleMs,
    });

    if (!directory) return;

    const eventIds = extractEventIdsFromDirectory(directory);

    await Promise.all(
      eventIds.map((eventId) =>
        queryClient.prefetchQuery({
          queryKey: queryKeys.lineups.byEvent(userId, eventId),
          queryFn: async () => {
            const response = await apiClient.get<LineupsResponse>(`/lineups/${eventId}`);
            return response.lineups;
          },
          staleTime: SERVER_SYNC_INTERVAL_MS,
        }),
      ),
    );
  } catch (error) {
    console.warn("Failed to preload lineups:", error);
  }
}
