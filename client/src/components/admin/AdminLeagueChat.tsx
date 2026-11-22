import { useEffect, useRef, useState } from "react";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useAdminLeagueMessagesQuery } from "../../hooks/useAdminLeagueMessages";
import type { AdminLeagueMessage, AdminLeagueMessageAttachment } from "../../types/admin";

const MESSAGE_CAP = 50;

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ImageAttachment({ attachment }: { attachment: AdminLeagueMessageAttachment }) {
  const sources = [attachment.url, attachment.thumbUrl].filter((value): value is string => Boolean(value));
  const [sourceIndex, setSourceIndex] = useState(0);
  const label = attachment.name || "Image";
  const src = sources[sourceIndex];

  if (!src) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-sm font-medium text-slate-900 underline"
      >
        {label}
      </a>
    );
  }

  return (
    <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 block max-w-xs">
      <img
        src={src}
        alt={label}
        className="max-h-48 border border-slate-300 bg-white"
        onError={() => setSourceIndex((index) => index + 1)}
      />
    </a>
  );
}

function AttachmentView({ attachment }: { attachment: AdminLeagueMessageAttachment }) {
  const label = attachment.name || attachment.type;
  if (attachment.type === "image") {
    return <ImageAttachment attachment={attachment} />;
  }
  if (attachment.type === "video") {
    return <video src={attachment.url} controls className="mt-2 max-h-48 max-w-xs" />;
  }
  if (attachment.type === "audio") {
    return <audio src={attachment.url} controls className="mt-2" />;
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-block text-sm font-medium text-slate-900 underline"
    >
      {label}
    </a>
  );
}

function MessageRow({ message }: { message: AdminLeagueMessage }) {
  const sender = message.userName || message.userId || "Unknown";
  return (
    <article className="border-b border-slate-200 px-3 py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-slate-900">
          <span className="break-all">{sender}</span>
          {message.audience === "bots" ? (
            <span className="ml-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Bots
            </span>
          ) : null}
          {message.kind ? (
            <span className="ml-2 font-mono text-xs text-slate-500">{message.kind}</span>
          ) : null}
        </p>
        <time
          dateTime={message.createdAt}
          className="shrink-0 text-xs tabular-nums text-slate-500"
        >
          {formatMessageTime(message.createdAt)}
        </time>
      </div>
      {message.text ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{message.text}</p>
      ) : null}
      {message.attachments.map((attachment) => (
        <AttachmentView key={`${message.id}-${attachment.url}`} attachment={attachment} />
      ))}
    </article>
  );
}

export function AdminLeagueChat({ leagueId }: { leagueId: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinnedLeague = useRef("");
  const query = useAdminLeagueMessagesQuery(leagueId);
  const messages = query.data?.messages ?? [];

  useEffect(() => {
    if (!query.data || pinnedLeague.current === leagueId) return;
    const node = scrollerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
    pinnedLeague.current = leagueId;
  }, [leagueId, query.data]);

  const errorMessage =
    query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null;
  const countLabel =
    messages.length >= MESSAGE_CAP
      ? `Latest ${MESSAGE_CAP} messages`
      : `${messages.length} message${messages.length === 1 ? "" : "s"}`;

  if (!leagueId) {
    return <p className="text-sm text-gray-600">League not found.</p>;
  }
  if (query.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }
  if (errorMessage) {
    return <ErrorMessage message={errorMessage} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Read-only. You can open this league without being a member. {countLabel}.
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-slate-300 rounded-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {query.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {messages.length === 0 ? (
        <p className="border border-slate-300 px-3 py-8 text-center text-sm text-gray-600">
          No messages in this league.
        </p>
      ) : (
        <div ref={scrollerRef} className="max-h-[32rem] overflow-y-auto border border-slate-300 bg-white">
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}
