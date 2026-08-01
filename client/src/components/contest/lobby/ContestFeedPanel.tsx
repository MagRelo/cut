import React, { useMemo, useState } from "react";
import { parseContestCommentaryFeedDocument } from "@cut/sport-pga-golf";
import type { ActivityResponse, FeedsClient } from "@stream-io/feeds-react-sdk";
import { type Contest } from "../../../types/contest";
import { useContestStreamFeed } from "../../../hooks/useContestStreamFeed";
import {
  STREAM_REACTIONS_ENABLED,
  STREAM_REACTION_TYPES,
  type StreamReactionType,
} from "../../../lib/stream/constants";
import { ContestCommentaryModal } from "./ContestCommentaryModal";
import {
  CutbotPost,
  type CutbotPostReactionState,
  type CutbotPostReactor,
} from "./CutbotPost";

export interface ContestFeedPanelProps {
  contest: Contest;
  /** Connected Stream client from lobby; omit/null falls back to JSON feed. */
  streamClient?: FeedsClient | null;
}

function reactorsFromActivity(activity: ActivityResponse): CutbotPostReactor[] {
  const typeRank = (type: string) => {
    const index = (STREAM_REACTION_TYPES as readonly string[]).indexOf(type);
    return index === -1 ? STREAM_REACTION_TYPES.length : index;
  };

  return (activity.latest_reactions ?? [])
    .filter((reaction) =>
      (STREAM_REACTION_TYPES as readonly string[]).includes(reaction.type),
    )
    .map((reaction) => ({
      type: reaction.type as StreamReactionType,
      displayName: reaction.user?.name?.trim() || "Someone",
      userId: reaction.user?.id ?? reaction.type,
    }))
    .sort((left, right) => {
      const typeDelta = typeRank(left.type) - typeRank(right.type);
      if (typeDelta !== 0) return typeDelta;
      return left.displayName.localeCompare(right.displayName);
    });
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
    reactors: reactorsFromActivity(activity),
  };
}

function activityGeneratedAt(activity: ActivityResponse): string | Date {
  const custom = activity.custom?.generatedAt;
  if (typeof custom === "string") return custom;
  return activity.created_at;
}

function activityGeneratedAtMs(activity: ActivityResponse): number {
  const value = activityGeneratedAt(activity);
  const parsed =
    typeof value === "string" ? Date.parse(value) : value.getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

const ContestBreakdownButton: React.FC<{ contest: Contest }> = ({ contest }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!contest.commentary) return null;

  return (
    <>
      <button
        type="button"
        className="group flex w-full items-center gap-3 rounded-sm border border-blue-200 bg-blue-50 p-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        onClick={() => setIsOpen(true)}
      >
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-400 bg-blue-200 text-xl shadow-sm"
        >
          🤖
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-blue-950">Contest Breakdown</span>
          <span className="block text-xs leading-relaxed text-blue-600">
            See each lineup&apos;s path to victory.
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-lg text-blue-600 transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </button>
      <ContestCommentaryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        commentary={contest.commentary}
        generatedAt={contest.commentaryGeneratedAt}
      />
    </>
  );
};

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
  // Stream orders by created_at; legacy posts were updated in place, so their
  // created_at no longer matches when the update was written.
  const ordered = useMemo(
    () =>
      [...activities].sort(
        (left, right) => activityGeneratedAtMs(right) - activityGeneratedAtMs(left),
      ),
    [activities],
  );

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
        {ordered.map((activity) => (
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
  return (
    <div className="space-y-3 font-display">
      {contest.commentary ? (
        <div className="space-y-2">
          <h2 className="m-0 font-display text-xl font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-2xl">
            Live Analysis
          </h2>
          <ContestBreakdownButton contest={contest} />
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="m-0 font-display text-xl font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-2xl">
          Contest Updates
        </h2>
        {streamClient ? (
          <StreamContestFeed contest={contest} client={streamClient} />
        ) : (
          <JsonFallbackFeed contest={contest} />
        )}
      </div>
    </div>
  );
};
