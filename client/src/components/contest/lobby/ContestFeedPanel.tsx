import React, { useMemo } from "react";
import { parseContestCommentaryFeedDocument } from "@cut/sport-pga-golf";
import type { ActivityResponse, FeedsClient } from "@stream-io/feeds-react-sdk";
import { type Contest } from "../../../types/contest";
import { contestLineupIdentityKeys } from "../../../lib/hasOnchainEscrow";
import { useContestStreamFeed } from "../../../hooks/useContestStreamFeed";
import {
  STREAM_REACTIONS_ENABLED,
  STREAM_REACTION_TYPES,
  type StreamReactionType,
} from "../../../lib/stream/constants";
import {
  CutbotPost,
  type CutbotPostReactionState,
  type CutbotPostReactor,
} from "./CutbotPost";

export interface ContestFeedPanelProps {
  contest: Contest;
  /** Connected Stream client from lobby; omit/null falls back to JSON feed. */
  streamClient?: FeedsClient | null;
  /** Current app user — used to highlight posts that mention them. */
  currentUserId?: string;
  /** True while placeholder lobby data is shown and the fetch is still in flight. */
  isLoading?: boolean;
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

function activityStoryType(activity: ActivityResponse): string | null {
  const custom = activity.custom?.storyType;
  if (typeof custom === "string" && custom.trim()) return custom.trim();
  if (typeof activity.type === "string" && activity.type.trim()) {
    return activity.type.trim();
  }
  return null;
}

function activityMentionsUser(
  activity: ActivityResponse,
  userId: string | undefined,
  userEntryIds: ReadonlySet<string>,
): boolean {
  if (!userId) return false;
  if ((activity.mentioned_users ?? []).some((user) => user.id === userId)) {
    return true;
  }
  const subjects = activity.custom?.subjects;
  if (!subjects || typeof subjects !== "object") return false;
  const entryIds = (subjects as { entryIds?: unknown }).entryIds;
  if (!Array.isArray(entryIds)) return false;
  return entryIds.some(
    (entryId) => typeof entryId === "string" && userEntryIds.has(entryId),
  );
}

function currentUserEntryIds(
  contest: Contest,
  userId: string | undefined,
): Set<string> {
  const entryIds = new Set<string>();
  if (!userId) return entryIds;
  for (const row of contest.contestLineups ?? []) {
    if (row.userId !== userId) continue;
    for (const key of contestLineupIdentityKeys(row)) {
      entryIds.add(key);
    }
  }
  return entryIds;
}

function jsonItemMentionsUser(
  entryIds: readonly string[] | undefined,
  userEntryIds: ReadonlySet<string>,
): boolean {
  if (userEntryIds.size === 0 || !entryIds?.length) return false;
  return entryIds.some((entryId) => userEntryIds.has(entryId));
}

const JsonFallbackFeed: React.FC<{
  contest: Contest;
  currentUserId?: string;
}> = ({ contest, currentUserId }) => {
  const items = useMemo(
    () => parseContestCommentaryFeedDocument(contest.commentaryFeed).items,
    [contest.commentaryFeed],
  );
  const userEntryIds = useMemo(
    () => currentUserEntryIds(contest, currentUserId),
    [contest, currentUserId],
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
            <CutbotPost
              text={item.text}
              generatedAt={item.generatedAt}
              storyType={item.storyType}
              isMentioned={jsonItemMentionsUser(
                item.subjects.entryIds,
                userEntryIds,
              )}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

const StreamContestFeed: React.FC<{
  contest: Contest;
  client: FeedsClient;
  currentUserId?: string;
}> = ({ contest, client, currentUserId }) => {
  const { activities, isLoading, error } = useContestStreamFeed(client, contest.id);
  const userEntryIds = useMemo(
    () => currentUserEntryIds(contest, currentUserId),
    [contest, currentUserId],
  );
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
    return (
      <JsonFallbackFeed contest={contest} currentUserId={currentUserId} />
    );
  }

  if (isLoading && activities.length === 0) {
    return (
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-6 text-center font-display">
        <p className="text-sm text-slate-600">Loading Cutbot updates…</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <JsonFallbackFeed contest={contest} currentUserId={currentUserId} />
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white font-display">
      <ul className="divide-y divide-slate-200">
        {ordered.map((activity) => (
          <li key={activity.id}>
            <CutbotPost
              text={activity.text ?? ""}
              generatedAt={activityGeneratedAt(activity)}
              storyType={activityStoryType(activity)}
              isMentioned={activityMentionsUser(
                activity,
                currentUserId,
                userEntryIds,
              )}
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
  currentUserId,
  isLoading = false,
}) => {
  return (
    <div className="space-y-3 font-display">
      <div className="space-y-2">
        <h2 className="m-0 font-display text-xl font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-2xl">
          Contest Updates
        </h2>
        {isLoading ? (
          <div className="rounded-sm border border-slate-200 bg-slate-50 p-6 text-center font-display">
            <p className="text-sm text-slate-600">Loading Cutbot updates…</p>
          </div>
        ) : streamClient ? (
          <StreamContestFeed
            contest={contest}
            client={streamClient}
            currentUserId={currentUserId}
          />
        ) : (
          <JsonFallbackFeed contest={contest} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
};
