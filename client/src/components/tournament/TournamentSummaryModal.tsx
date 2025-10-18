import React from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

interface TournamentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TournamentSummaryModal: React.FC<TournamentSummaryModalProps> = ({
  isOpen,
  onClose,
}) => {
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
                2025 Bank of Utah Championship
              </DialogTitle>
              <p className="text-sm font-semibold text-gray-700">Black Desert Resort Golf Course</p>
              <p className="text-xs text-gray-500 font-medium">Ivins, Utah</p>
            </div>

            {/* Scrollable content area */}
            <div className="max-h-[60vh] overflow-y-auto pt-4 -mx-2 px-2">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Best Players and Odds
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">
                        Tom Kim and Sahith Theegala:
                      </span>{" "}
                      Among the early betting favorites for the tournament.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Justin Rose:</span> Appears near
                      the top tier of contenders.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Harris English:</span> Also
                      among the top-tier favorites.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Matt McCarty:</span> Defending
                      champion and one of the favorites to repeat.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">
                        Nick Hardy and Lee Hodges:
                      </span>{" "}
                      Longshots gaining interest, both top-10 finishers last year.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Key Storylines
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">FedEx Cup Fall Series:</span>{" "}
                      Part of the PGA Tour's FedEx Cup Fall series, offering players crucial points
                      toward retaining or improving PGA Tour status for 2026.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Tournament Dates:</span> October
                      23–26, 2025, marking the second year at Black Desert Resort.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Rebranding:</span> The event was
                      rebranded from the Black Desert Championship to the Bank of Utah Championship.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Perfect Conditions:</span>{" "}
                      Weather forecasts indicate warm and dry conditions with highs around 80–83°F
                      and lows in the mid-50s—ideal scoring weather typical of late October in
                      southern Utah.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Tournament History
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">Defending Champion:</span> Matt
                      McCarty won the 2024 Black Desert Championship with a final round of 67,
                      finishing three shots ahead of Stephan Jaeger.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Recent Top Finishers:</span>{" "}
                      Lucas Glover and Kevin Streelman tied for third place in 2024.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Tour History:</span> The event
                      replaced the long-running Utah Championship on the Korn Ferry Tour, aligning
                      with the PGA Tour's fall schedule restructuring.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Course and Format
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">Course:</span> Black Desert
                      Resort Golf Course (Ivins, Utah), par 71, 7,421 yards.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Designer:</span> Designed by the
                      late Tom Weiskopf, featuring striking lava rock formations and expansive views
                      of Snow Canyon—one of the most visually recognizable stops on the fall
                      schedule.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Total Purse:</span> $6 million
                      with a winner's share of $1,080,000.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Format:</span> Standard 72-hole
                      stroke play.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Broadcast Information
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">TV:</span> Golf Channel and NBC
                      Sports App.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Thursday, Oct 23:</span> 5–8 PM
                      ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Friday, Oct 24:</span> 5–8 PM ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Saturday, Oct 25:</span>{" "}
                      4:30–7:30 PM ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Sunday, Oct 26:</span> 4–7 PM ET
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
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
