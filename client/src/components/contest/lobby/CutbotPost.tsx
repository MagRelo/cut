import React, { useCallback, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { FeedsClient } from "@stream-io/feeds-react-sdk";
import {
  STREAM_REACTION_LABELS,
  STREAM_REACTION_TYPES,
  type StreamReactionType,
} from "../../../lib/stream/constants";

export interface CutbotPostReactionState {
  counts: Partial<Record<StreamReactionType, number>>;
  ownType: StreamReactionType | null;
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
      } catch (error) {
        console.error("[stream] Reaction failed:", error);
      } finally {
        setPendingType(null);
      }
    },
    [streamClient, activityId, canReact, pendingType, reactions?.ownType],
  );

  const showReactions = Boolean(reactions && activityId);

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
              <>
                <span className="text-sm text-slate-400" aria-hidden="true">
                  ·
                </span>
                <time className="ml-auto shrink-0 text-xs text-slate-500">
                  {formattedGeneratedAt}
                </time>
              </>
            ) : null}
          </header>

          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {text}
          </p>

          {showReactions && reactions ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {STREAM_REACTION_TYPES.map((type) => {
                const count = reactions.counts[type] ?? 0;
                const selected = reactions.ownType === type;
                const label = STREAM_REACTION_LABELS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!canReact || pendingType != null}
                    aria-pressed={selected}
                    aria-label={label}
                    onClick={() => void onToggleReaction(type)}
                    className={[
                      "inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs transition-colors",
                      selected
                        ? "border-blue-400 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-white text-slate-600",
                      canReact
                        ? "hover:border-blue-300 hover:bg-blue-50/60"
                        : "cursor-default opacity-80",
                      pendingType === type ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <span>{label}</span>
                    {count > 0 ? (
                      <span className="tabular-nums text-slate-500">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};
