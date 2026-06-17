import React, { Fragment, useMemo, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import type { Candidate } from "@cut/sport-sdk";
import { useEventCandidatesQuery } from "../../hooks/useSportData";
import { useCandidateSort } from "../../hooks/useCandidateSort";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinner } from "../common/LoadingSpinner";

interface CandidatePickerProps {
  sportId: string;
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedEventParticipantIds: string[];
  onSelect: (eventParticipantId: string) => void | Promise<void>;
  onClearSlot?: () => void;
  isSaving?: boolean;
  saveError?: string | null;
}

export const CandidatePicker: React.FC<CandidatePickerProps> = ({
  sportId,
  eventId,
  isOpen,
  onClose,
  selectedEventParticipantIds,
  onSelect,
  onClearSlot,
  isSaving = false,
  saveError = null,
}) => {
  const plugin = useSportUIPlugin(sportId);
  const { sort } = useCandidateSort(sportId);
  const { data: candidates = [], isLoading } = useEventCandidatesQuery(sportId, eventId);
  const [searchQuery, setSearchQuery] = useState("");
  const CandidateRow = plugin?.CandidateRow;

  const sortedCandidates = useMemo(
    () => sort(candidates, "picker"),
    [candidates, sort],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedCandidates;
    return sortedCandidates.filter((candidate) => candidate.displayName.toLowerCase().includes(q));
  }, [sortedCandidates, searchQuery]);

  const handleClose = () => {
    if (isSaving) return;
    setSearchQuery("");
    onClose();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="border-b border-gray-200 px-4 py-3">
                <DialogTitle className="font-display text-lg font-semibold text-gray-900">
                  {isSaving ? "Saving lineup..." : "Select player"}
                </DialogTitle>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search players..."
                  disabled={isSaving}
                  className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="relative min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-gray-600 via-gray-700 to-gray-900">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : !CandidateRow ? (
                  <p className="p-4 text-sm text-gray-300">No picker available for this sport.</p>
                ) : (
                  <div className="flex flex-col gap-3 p-3">
                    {filtered.map((candidate: Candidate) => {
                      const isAlreadySelected = selectedEventParticipantIds.includes(
                        candidate.eventParticipantId,
                      );
                      return (
                        <CandidateRow
                          key={candidate.eventParticipantId}
                          candidate={candidate}
                          onSelect={() => void onSelect(candidate.eventParticipantId)}
                          isSelected={isAlreadySelected}
                          disabled={isSaving || isAlreadySelected}
                        />
                      );
                    })}
                  </div>
                )}
                {isSaving ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gray-900/60">
                    <LoadingSpinner />
                    <span className="font-display text-sm font-medium text-white">Saving...</span>
                  </div>
                ) : null}
              </div>

              {saveError ? (
                <div className="border-t border-gray-200 p-3">
                  <ErrorMessage message={saveError} />
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
                {onClearSlot ? (
                  <button
                    type="button"
                    onClick={() => void onClearSlot()}
                    disabled={isSaving}
                    className="rounded-md px-2 py-1.5 text-xs font-normal text-gray-500 font-display transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Leave empty
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="rounded-md px-2 py-1.5 text-xs font-normal text-gray-500 font-display transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};
