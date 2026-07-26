import React from "react";
import { Modal } from "../../common/Modal";
import { CutbotPost } from "./CutbotPost";

export interface ContestCommentaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  commentary: string;
  generatedAt?: string | Date | null;
}

export const ContestCommentaryModal: React.FC<ContestCommentaryModalProps> = ({
  isOpen,
  onClose,
  commentary,
  generatedAt,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contest Breakdown"
      hideHeader
      maxWidth="lg"
      scrollable
      maxHeight="70vh"
      panelClassName="overflow-hidden bg-gray-100 p-2"
      contentClassName="rounded-sm border border-gray-300 bg-white"
    >
      <CutbotPost text={commentary} generatedAt={generatedAt} />
    </Modal>
  );
};
