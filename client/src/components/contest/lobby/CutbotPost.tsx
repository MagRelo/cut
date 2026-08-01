import React, { useCallback, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { FeedsClient } from "@stream-io/feeds-react-sdk";
import {
  STREAM_REACTION_EMOJIS,
  STREAM_REACTION_LABELS,
  STREAM_REACTION_TYPES,
  type StreamReactionType,
} from "../../../lib/stream/constants";

export interface CutbotPostReactor {
  type: StreamReactionType;
  displayName: string;
  userId: string;
}

export interface CutbotPostReactionState {
  counts: Partial<Record<StreamReactionType, number>>;
  ownType: StreamReactionType | null;
  /** Recent reactors from the activity (may be a subset of total counts). */
  reactors: CutbotPostReactor[];
}

export interface CutbotPostProps {
  text: string;
  generatedAt?: string | Date | null;
  className?: string;
  /** When set with activityId, shows the Stream reaction bar. */
  reactions?: CutbotPostReactionState | null;
  activityId?: string | null;
  streamClient?: FeedsClient | null;
  canReact?: boolean;
}

function formatGeneratedAt(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return formatDistanceToNow(date, { addSuffix: true });
}

function reactionTypeRank(type: string): number {
  const index = (STREAM_REACTION_TYPES as readonly string[]).indexOf(type);
  return index === -1 ? STREAM_REACTION_TYPES.length : index;
}

function sortReactors(reactors: readonly CutbotPostReactor[]): CutbotPostReactor[] {
  return [...reactors].sort((left, right) => {
    const typeDelta = reactionTypeRank(left.type) - reactionTypeRank(right.type);
    if (typeDelta !== 0) return typeDelta;
    return left.displayName.localeCompare(right.displayName);
  });
}

function parseReactorRows(
  rows: readonly {
    type: string;
    user?: { id?: string; name?: string | null } | null;
  }[],
): CutbotPostReactor[] {
  const reactors: CutbotPostReactor[] = [];
  for (const row of rows) {
    if (!(STREAM_REACTION_TYPES as readonly string[]).includes(row.type)) continue;
    const userId = row.user?.id?.trim();
    if (!userId) continue;
    const displayName = row.user?.name?.trim() || "Someone";
    reactors.push({
      type: row.type as StreamReactionType,
      displayName,
      userId,
    });
  }
  return sortReactors(reactors);
}

export const CutbotPost: React.FC<CutbotPostProps> = ({
  text,
  generatedAt,
  className,
  reactions,
  activityId,
  streamClient,
  canReact = false,
}) => {
  const formattedGeneratedAt = formatGeneratedAt(generatedAt);
  const [pendingType, setPendingType] = useState<StreamReactionType | null>(null);
  const [expandedReactors, setExpandedReactors] = useState<CutbotPostReactor[] | null>(
    null,
  );
  const [loadingReactors, setLoadingReactors] = useState(false);

  const onToggleReaction = useCallback(
    async (type: StreamReactionType) => {
      if (!streamClient || !activityId || !canReact || pendingType) return;
      setPendingType(type);
      try {
        if (reactions?.ownType === type) {
          await streamClient.deleteActivityReaction({
            activity_id: activityId,
            type,
          });
        } else {
          await streamClient.addActivityReaction({
            activity_id: activityId,
            type,
            enforce_unique: true,
            create_notification_activity: false,
            skip_push: true,
          });
        }
        // Activity state will refresh via watch; clear any fetched override.
        setExpandedReactors(null);
      } catch (error) {
        console.error("[stream] Reaction failed:", error);
      } finally {
        setPendingType(null);
      }
    },
    [streamClient, activityId, canReact, pendingType, reactions?.ownType],
  );

  const showReactions = Boolean(reactions && activityId);
  const totalReactions = useMemo(() => {
    if (!reactions) return 0;
    return STREAM_REACTION_TYPES.reduce(
      (sum, type) => sum + (reactions.counts[type] ?? 0),
      0,
    );
  }, [reactions]);

  const listedReactors = expandedReactors ?? reactions?.reactors ?? [];

  const loadFullReactors = useCallback(async () => {
    if (!streamClient || !activityId || loadingReactors) return;
    if (expandedReactors) return;
    if (totalReactions <= (reactions?.reactors.length ?? 0)) return;

    setLoadingReactors(true);
    try {
      const response = await streamClient.queryActivityReactions({
        activity_id: activityId,
        limit: 100,
      });
      setExpandedReactors(parseReactorRows(response.reactions ?? []));
    } catch (error) {
      console.error("[stream] Failed to load reactors:", error);
    } finally {
      setLoadingReactors(false);
    }
  }, [
    streamClient,
    activityId,
    loadingReactors,
    expandedReactors,
    totalReactions,
    reactions?.reactors.length,
  ]);

  return (
    <article className={className ?? "p-4 font-display"}>
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-400 bg-blue-200 text-xl shadow-sm"
        >
          🤖
        </span>

        <div className="min-w-0 flex-1">
          <header className="flex h-10 items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900">Cutbot</span>
            <span className="text-sm text-slate-500">@cutbot</span>
            {formattedGeneratedAt ? (
              <time className="ml-auto shrink-0 text-xs text-slate-500">
                {formattedGeneratedAt}
              </time>
            ) : null}
          </header>

          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{text}</p>

          {showReactions && reactions ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {STREAM_REACTION_TYPES.map((type) => {
                  const count = reactions.counts[type] ?? 0;
                  const selected = reactions.ownType === type;
                  const label = STREAM_REACTION_LABELS[type];
                  const emoji = STREAM_REACTION_EMOJIS[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={!canReact || pendingType != null}
                      aria-pressed={selected}
                      aria-label={label}
                      title={label}
                      onClick={() => void onToggleReaction(type)}
                      className={[
                        "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-2 transition-colors",
                        selected
                          ? "bg-blue-100 ring-1 ring-blue-300"
                          : "bg-transparent hover:bg-slate-100",
                        canReact ? "" : "cursor-default opacity-80",
                        pendingType === type ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <span aria-hidden="true" className="text-base leading-none">
                        {emoji}
                      </span>
                      {count > 0 ? (
                        <span className="text-sm tabular-nums text-slate-500">{count}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {totalReactions > 0 ? (
                <details
                  className="group rounded-sm border border-slate-100 bg-slate-50/80 open:bg-slate-50"
                  onToggle={(event) => {
                    if ((event.currentTarget as HTMLDetailsElement).open) {
                      void loadFullReactors();
                    }
                  }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-center gap-1 px-2 py-1.5 text-xs text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span>
                      {totalReactions === 1
                        ? "1 reaction"
                        : `${totalReactions} reactions`}
                    </span>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <ul className="space-y-1 border-t border-slate-100 px-3 py-2">
                    {loadingReactors && listedReactors.length === 0 ? (
                      <li className="text-xs text-slate-400">Loading…</li>
                    ) : listedReactors.length === 0 ? (
                      <li className="text-xs text-slate-400">No names available yet.</li>
                    ) : (
                      listedReactors.map((reactor) => (
                        <li
                          key={`${reactor.userId}:${reactor.type}`}
                          className="flex items-center gap-2 text-xs text-slate-600"
                        >
                          <span aria-hidden="true">
                            {STREAM_REACTION_EMOJIS[reactor.type]}
                          </span>
                          <span className="italic">
                            {`- ${reactor.displayName}`}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};
