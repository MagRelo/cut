import React from "react";
import { formatDistanceToNow } from "date-fns";

export interface CutbotPostProps {
  text: string;
  generatedAt?: string | Date | null;
  className?: string;
}

function formatGeneratedAt(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return formatDistanceToNow(date, { addSuffix: true });
}

export const CutbotPost: React.FC<CutbotPostProps> = ({ text, generatedAt, className }) => {
  const formattedGeneratedAt = formatGeneratedAt(generatedAt);

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
        </div>
      </div>
    </article>
  );
};
