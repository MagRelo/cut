import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import {
  arePrimaryActionsLocked,
  type Contest,
  type TimelineData,
} from "../types/contest";
import { normalizeContestAddress } from "../utils/contestRoutes";
import { CONTEST_LOBBY_GC_MS, SERVER_SYNC_INTERVAL_MS } from "../lib/queryTiming";
import { maxTimelineTimestamp, mergeTimelineData } from "../lib/mergeTimelineData";
import { isContestLiveTracked } from "./useContestQuery";

/**
 * Contest timeline chart data — separate from lobby standings.
 * Initial load is full history; subsequent polls request `?since=` and merge.
 */
export function useContestTimelineQuery(
  contestAddress: string | undefined,
  contest: Contest | undefined,
) {
  const routeKey = contestAddress ? normalizeContestAddress(contestAddress) : "";
  const queryClient = useQueryClient();
  const timelineEnabled =
    !!routeKey && !!contest && arePrimaryActionsLocked(contest.status);

  return useQuery({
    queryKey: queryKeys.contests.timeline(routeKey),
    queryFn: async (): Promise<TimelineData> => {
      if (!routeKey) throw new Error("Contest address is required");

      const cached = queryClient.getQueryData<TimelineData>(
        queryKeys.contests.timeline(routeKey),
      );
      const since = maxTimelineTimestamp(cached);
      const params = since ? `?since=${encodeURIComponent(since)}` : "";
      const delta = await apiClient.get<TimelineData>(
        `/contests/${routeKey}/timeline${params}`,
      );
      return mergeTimelineData(cached, delta);
    },
    enabled: timelineEnabled,
    staleTime: (query) => {
      if (query.state.data?.contestFinished) return Infinity;
      return isContestLiveTracked(contest) ? SERVER_SYNC_INTERVAL_MS : Infinity;
    },
    refetchInterval: (query) => {
      if (query.state.data?.contestFinished) return false;
      return isContestLiveTracked(contest) ? SERVER_SYNC_INTERVAL_MS : false;
    },
    gcTime: CONTEST_LOBBY_GC_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
