import type { QueryClient } from "@tanstack/react-query";
import type { ContestDirectoryResponse } from "../types/contest";
import type { PlatformLineupListItem } from "../types/lineup";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";
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
 */
export async function preloadLineups(
  queryClient: QueryClient,
  userId: string,
  chainId?: number,
): Promise<void> {
  try {
    const params = new URLSearchParams({ scope: "all" });
    if (chainId) {
      params.set("chainId", String(chainId));
    }

    const directoryKey = queryKeys.contests.directory(
      "all",
      userId,
      chainId ?? "all",
    );
    let directory = queryClient.getQueryData<ContestDirectoryResponse>(directoryKey);

    if (!directory) {
      directory = await queryClient.fetchQuery({
        queryKey: directoryKey,
        queryFn: () =>
          apiClient.get<ContestDirectoryResponse>(
            `/contests/directory?${params.toString()}`,
          ),
        staleTime: 15 * 60 * 1000,
      });
    }

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
