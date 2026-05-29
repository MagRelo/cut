import React from "react";
import { Modal } from "../../../common/Modal";
import type { SideBetMarketSelectionDto } from "../../../../types/sideBet";
import { SideBetPlaceForm, type SideBetPlaceFormProps } from "./SideBetPlaceForm";

export interface SideBetPlaceModalProps extends Omit<SideBetPlaceFormProps, "activeSelection" | "onCancel"> {
  isOpen: boolean;
  activeSelection: SideBetMarketSelectionDto | null;
  onClose: () => void;
}

export const SideBetPlaceModal: React.FC<SideBetPlaceModalProps> = ({
  isOpen,
  activeSelection,
  onClose,
  isPayingOracle,
  isRecording,
  ...formProps
}) => (
  <Modal
    isOpen={isOpen}
    onClose={() => {
      if (isPayingOracle || isRecording) return;
      onClose();
    }}
    title="Parlay"
    hideHeader
    maxWidth="md"
    panelClassName="bg-gray-50"
    contentClassName="p-2 font-display"
  >
    {activeSelection ? (
      <SideBetPlaceForm
        {...formProps}
        activeSelection={activeSelection}
        isPayingOracle={isPayingOracle}
        isRecording={isRecording}
        onCancel={onClose}
      />
    ) : null}
  </Modal>
);
