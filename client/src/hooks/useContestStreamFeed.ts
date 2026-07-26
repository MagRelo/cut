import { useEffect, useMemo, useState } from "react";
import {
  useFeedActivities,
  type ActivityResponse,
  type Feed,
  type FeedsClient,
} from "@stream-io/feeds-react-sdk";
import { STREAM_CONTEST_FEED_GROUP } from "../lib/stream/constants";

export function useContestStreamFeed(
  client: FeedsClient | null,
  contestId: string,
): {
  feed: Feed | null;
  activities: ActivityResponse[];
  isLoading: boolean;
  error: Error | null;
} {
  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);

  const feed = useMemo(() => {
    if (!client) return null;
    return client.feed(STREAM_CONTEST_FEED_GROUP, contestId);
  }, [client, contestId]);

  useEffect(() => {
    if (!feed) {
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);
    setError(null);

    void feed
      .getOrCreate({ watch: true })
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [feed]);

  const feedState = useFeedActivities(feed ?? undefined);
  const activities = ready ? (feedState?.activities ?? []) : [];
  const isLoading = Boolean(feed) && (!ready || Boolean(feedState?.is_loading));

  return {
    feed,
    activities,
    isLoading,
    error,
  };
}
