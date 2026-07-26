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

/**
 * Unread mention groups for this contest.
 * Notification feeds are aggregated — `mark_read` expects group ids (`group`),
 * not individual activity ids.
 */
function unreadMentionGroupsForContest(
  groups: readonly AggregatedActivityResponse[],
  contestId: string,
): { groupIds: string[]; activityCount: number } {
  const groupIds: string[] = [];
  let activityCount = 0;

  for (const group of groups) {
    if (group.is_read) continue;
    const contestScoped = group.activities.filter((activity) =>
      activityMatchesContest(activity, contestId),
    );
    if (contestScoped.length === 0) continue;
    groupIds.push(group.group);
    activityCount += contestScoped.length;
  }

  return { groupIds, activityCount };
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
  const [markedGroupIds, setMarkedGroupIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const userId = client && user?.id ? user.id : null;

  // Reset optimistic marks when contest or user session changes.
  useEffect(() => {
    setMarkedGroupIds(new Set());
  }, [contestId, userId]);

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

  const { groupIds, activityCount } = useMemo(() => {
    if (watchFailed || !feed) {
      return { groupIds: [] as string[], activityCount: 0 };
    }
    const unread = unreadMentionGroupsForContest(groups, contestId);
    const pendingGroupIds = unread.groupIds.filter((id) => !markedGroupIds.has(id));
    if (pendingGroupIds.length === unread.groupIds.length) {
      return unread;
    }
    // After a local mark, hide those groups from the badge immediately.
    let pendingActivityCount = 0;
    for (const group of groups) {
      if (group.is_read || markedGroupIds.has(group.group)) continue;
      const contestScoped = group.activities.filter((activity) =>
        activityMatchesContest(activity, contestId),
      );
      pendingActivityCount += contestScoped.length;
    }
    return { groupIds: pendingGroupIds, activityCount: pendingActivityCount };
  }, [watchFailed, feed, groups, contestId, markedGroupIds]);

  const markContestMentionsRead = useCallback(async () => {
    if (!feed || groupIds.length === 0) return;
    const toMark = [...groupIds];
    setMarkedGroupIds((prev) => {
      const next = new Set(prev);
      for (const id of toMark) next.add(id);
      return next;
    });
    try {
      await feed.markActivity({ mark_read: toMark });
    } catch (error) {
      console.error("[stream] Failed to mark mentions read:", error);
      setMarkedGroupIds((prev) => {
        const next = new Set(prev);
        for (const id of toMark) next.delete(id);
        return next;
      });
    }
  }, [feed, groupIds]);

  return {
    unreadCount: activityCount,
    markContestMentionsRead,
  };
}
