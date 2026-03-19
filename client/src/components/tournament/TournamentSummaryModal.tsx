import React from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useCurrentTournament } from "../../hooks/useTournamentData";
import type { TournamentSummarySections } from "../../types/tournament";

interface TournamentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TournamentSummaryModal: React.FC<TournamentSummaryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { tournament } = useCurrentTournament();

  const summarySections: TournamentSummarySections | undefined = tournament?.summarySections;
  const headerLocation =
    tournament?.city && tournament?.state
      ? `${tournament.city}, ${tournament.state}`
      : tournament?.city
        ? tournament.city
        : tournament?.state
          ? tournament.state
          : "";

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Modal container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg">
          <div className="p-4 sm:p-6">
            <div className="space-y-1 pb-4 border-b border-gray-200">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {tournament?.name ?? "Tournament Summary"}
              </DialogTitle>
              <p className="text-sm font-semibold text-gray-700">
                {tournament?.course ?? "—"}
              </p>
              <p className="text-xs text-gray-500 font-medium">
                {headerLocation || "—"}
              </p>
            </div>

            {/* Scrollable content area */}
            <div className="max-h-[60vh] overflow-y-auto pt-4 -mx-2 px-2">
              <div className="space-y-4">
                {summarySections && summarySections.length > 0 ? (
                  summarySections.map((section, sectionIndex) => (
                    <div key={`${section.title}-${sectionIndex}`}>
                      <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                        {section.title}
                      </h3>
                      <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                        {section.items.map((item, itemIndex) => (
                          <li key={`${item.label ?? "item"}-${itemIndex}`}>
                            {item.label ? (
                              <span className="font-semibold text-gray-900">{item.label}</span>
                            ) : null}
                            {item.label ? " " : null}
                            {item.body}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No tournament summary available.</p>
                )}
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-gray-200 flex justify-end">
              <button
                onClick={onClose}
                className="px-2 py-1 text-sm border border-gray-300 font-display text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
