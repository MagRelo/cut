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
                      <span className="font-semibold text-gray-900">Alex Noren (+1400):</span>{" "}
                      Highest-ranked player in the field and current betting favorite. Known for
                      precision short game and consistency in windy or firm desert conditions.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Jason Day (+1600):</span> Former
                      Major winner with several solid FedEx Cup Fall finishes. His controlled iron
                      play and experience on firm courses make him a strong contender.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Billy Horschel (+1800):</span>{" "}
                      Veteran competitor trending upward with multiple top-20 fall results. His
                      accuracy and patience fit Black Desert's strategic layout.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Maverick McNealy (+2000):</span>{" "}
                      Excellent putter and known birdie-maker, often thrives on wide fairways like
                      those in Ivins, Utah. Viewed as a sleeper-to-favorite bet range this week.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Kurt Kitayama (+2200):</span>{" "}
                      Long hitter who performs well in altitude-adjusted settings. His aggressive
                      playstyle could pay off if desert winds stay calm.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Matt McCarty (+2500):</span>{" "}
                      Defending champion after dominating the event in 2024. His familiarity with
                      the Black Desert layout gives him a statistical edge despite less overall Tour
                      experience.
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
