import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAggregatedActivities,
  type AggregatedActivityResponse,
  type FeedsClient,
} from "@stream-io/feeds-react-sdk";
import { useAuth } from "../contexts/AuthContext";
import { STREAM_CONTEST_FEED_GROUP } from "../lib/stream/constants";

function activityMatchesContest(
  activity: { custom?: Record<string, unknown>; feeds?: string[] },
  contestId: string,
): boolean {
  if (activity.custom?.contestId === contestId) return true;
  const feedId = `${STREAM_CONTEST_FEED_GROUP}:${contestId}`;
  return (activity.feeds ?? []).includes(feedId);
}

function unreadMentionActivityIdsForContest(
  groups: readonly AggregatedActivityResponse[],
  contestId: string,
): string[] {
  const ids: string[] = [];
  for (const group of groups) {
    if (group.is_read) continue;
    const contestScoped = group.activities.filter((activity) =>
      activityMatchesContest(activity, contestId),
    );
    if (contestScoped.length === 0) continue;
    for (const activity of contestScoped) {
      ids.push(activity.id);
    }
  }
  return [...new Set(ids)];
}

/**
 * Unread Cutbot mention count for the current contest, from the user's
 * notification feed. Marks those notifications read when requested.
 */
export function useContestMentionBadge(
  client: FeedsClient | null,
  contestId: string,
): {
  unreadCount: number;
  markContestMentionsRead: () => Promise<void>;
} {
  const { user } = useAuth();
  const [watchFailed, setWatchFailed] = useState(false);
  const userId = client && user?.id ? user.id : null;

  const feed = useMemo(() => {
    if (!client || !userId) return null;
    return client.feed("notification", userId);
  }, [client, userId]);

  useEffect(() => {
    if (!feed) return;
    let cancelled = false;
    setWatchFailed(false);
    void feed.getOrCreate({ watch: true }).catch(() => {
      if (!cancelled) setWatchFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [feed]);

  const aggregatedState = useAggregatedActivities(feed ?? undefined);
  const groups = aggregatedState?.aggregated_activities ?? [];

  const unreadIds = useMemo(
    () =>
      watchFailed || !feed
        ? []
        : unreadMentionActivityIdsForContest(groups, contestId),
    [watchFailed, feed, groups, contestId],
  );

  const markContestMentionsRead = useCallback(async () => {
    if (!feed || unreadIds.length === 0) return;
    try {
      await feed.markActivity({ mark_read: unreadIds });
    } catch (error) {
      console.error("[stream] Failed to mark mentions read:", error);
    }
  }, [feed, unreadIds]);

  return {
    unreadCount: unreadIds.length,
    markContestMentionsRead,
  };
}
