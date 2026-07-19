import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Modal } from "../../common/Modal";

export interface ContestCommentaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  commentary: string;
  generatedAt?: string | Date | null;
}

function formatGeneratedAt(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return formatDistanceToNow(date, { addSuffix: true });
}

export const ContestCommentaryModal: React.FC<ContestCommentaryModalProps> = ({
  isOpen,
  onClose,
  commentary,
  generatedAt,
}) => {
  const formattedGeneratedAt = formatGeneratedAt(generatedAt);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contest Breakdown"
      maxWidth="lg"
      scrollable
      maxHeight="70vh"
      panelClassName="overflow-hidden bg-white"
    >
      <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-5 py-5 text-white">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl shadow-sm ring-1 ring-white/20"
          >
            🤖
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">
              Live contest intelligence
            </div>
            <h3 className="mt-0.5 font-display text-xl font-bold tracking-tight">
              The contest, decoded.
            </h3>
          </div>
        </div>
        <p className="mt-3 max-w-md font-display text-sm leading-relaxed text-blue-100">
          Cutbot weighs the live scores, lineup leverage, and time remaining to find the paths to
          victory.
        </p>
      </div>

      <div className="bg-slate-50 p-5">
        <figure>
          <blockquote className="rounded-sm border border-l-[3px] border-blue-200 border-l-blue-600 bg-white p-5 text-blue-950 shadow-sm">
            <p className="whitespace-pre-line font-mono text-base font-medium italic leading-relaxed">
              &ldquo;{commentary}&rdquo;
            </p>
            <footer className="mt-5 text-right font-mono text-base font-normal italic">
              &mdash; 🤖 Cutbot
            </footer>
            {formattedGeneratedAt ? (
              <p className="mt-1 text-right font-mono text-xs italic text-blue-950/60">
                Generated {formattedGeneratedAt}
              </p>
            ) : null}
          </blockquote>
        </figure>
      </div>
    </Modal>
  );
};
