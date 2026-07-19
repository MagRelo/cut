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
      title="Contest Analysis"
      maxWidth="lg"
      scrollable
      maxHeight="70vh"
      contentClassName="pt-4 pb-5 px-5"
    >
      <figure>
        <blockquote className="rounded-sm border-l-[3px] border-blue-500 bg-blue-50 px-4 py-3 text-blue-950">
          <p className="whitespace-pre-line font-serif text-base font-medium italic leading-relaxed">
            &ldquo;{commentary}&rdquo;
          </p>
          <footer className="mt-5 text-right font-serif text-base font-semibold italic">
            &mdash; 🤖 Cutbot
          </footer>
          {formattedGeneratedAt ? (
            <p className="mt-1 text-right font-display text-xs italic text-blue-950/70">
              Generated {formattedGeneratedAt}
            </p>
          ) : null}
        </blockquote>
      </figure>
    </Modal>
  );
};
