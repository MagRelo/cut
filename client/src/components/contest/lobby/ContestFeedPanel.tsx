import React, { useMemo } from "react";
import { parseContestCommentaryFeedDocument } from "@cut/sport-pga-golf";
import type { ActivityResponse, FeedsClient } from "@stream-io/feeds-react-sdk";
import { type Contest } from "../../../types/contest";
import { useContestStreamFeed } from "../../../hooks/useContestStreamFeed";
import {
  STREAM_REACTIONS_ENABLED,
  STREAM_REACTION_TYPES,
  type StreamReactionType,
} from "../../../lib/stream/constants";
import { CutbotPost, type CutbotPostReactionState } from "./CutbotPost";

export interface ContestFeedPanelProps {
  contest: Contest;
  /** Connected Stream client from lobby; omit/null falls back to JSON feed. */
  streamClient?: FeedsClient | null;
}

function reactionStateFromActivity(
  activity: ActivityResponse,
): CutbotPostReactionState {
  const counts: Partial<Record<StreamReactionType, number>> = {};
  for (const type of STREAM_REACTION_TYPES) {
    const group = activity.reaction_groups?.[type];
    if (group?.count) counts[type] = group.count;
  }
  const own = activity.own_reactions?.find((reaction) =>
    (STREAM_REACTION_TYPES as readonly string[]).includes(reaction.type),
  );
  return {
    counts,
    ownType: (own?.type as StreamReactionType | undefined) ?? null,
  };
}

function activityGeneratedAt(activity: ActivityResponse): string | Date {
  const custom = activity.custom?.generatedAt;
  if (typeof custom === "string") return custom;
  return activity.created_at;
}

const JsonFallbackFeed: React.FC<{ contest: Contest }> = ({ contest }) => {
  const items = useMemo(
    () => parseContestCommentaryFeedDocument(contest.commentaryFeed).items,
    [contest.commentaryFeed],
  );

  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-6 text-center font-display">
        <p className="text-sm text-slate-600">Cutbot hasn&apos;t posted any updates yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white font-display">
      <ul className="divide-y divide-slate-200">
        {items.map((item) => (
          <li key={item.id}>
            <CutbotPost text={item.text} generatedAt={item.generatedAt} />
          </li>
        ))}
      </ul>
    </div>
  );
};

const StreamContestFeed: React.FC<{
  contest: Contest;
  client: FeedsClient;
}> = ({ contest, client }) => {
  const { activities, isLoading, error } = useContestStreamFeed(client, contest.id);

  if (error) {
    return <JsonFallbackFeed contest={contest} />;
  }

  if (isLoading && activities.length === 0) {
    return (
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-6 text-center font-display">
        <p className="text-sm text-slate-600">Loading Cutbot updates…</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return <JsonFallbackFeed contest={contest} />;
  }

  return (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white font-display">
      <ul className="divide-y divide-slate-200">
        {activities.map((activity) => (
          <li key={activity.id}>
            <CutbotPost
              text={activity.text ?? ""}
              generatedAt={activityGeneratedAt(activity)}
              activityId={
                STREAM_REACTIONS_ENABLED ? activity.id : undefined
              }
              streamClient={STREAM_REACTIONS_ENABLED ? client : undefined}
              canReact={STREAM_REACTIONS_ENABLED}
              reactions={
                STREAM_REACTIONS_ENABLED
                  ? reactionStateFromActivity(activity)
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ContestFeedPanel: React.FC<ContestFeedPanelProps> = ({
  contest,
  streamClient = null,
}) => {
  if (streamClient) {
    return <StreamContestFeed contest={contest} client={streamClient} />;
  }

  return <JsonFallbackFeed contest={contest} />;
};
