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
                2025 RSM Classic
              </DialogTitle>
              <p className="text-sm font-semibold text-gray-700">
                Sea Island Golf Club (Seaside & Plantation Courses)
              </p>
              <p className="text-xs text-gray-500 font-medium">St. Simons Island, Georgia</p>
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
                      <span className="font-semibold text-gray-900">Harris English (+2000):</span>{" "}
                      Sea Island resident, FedEx Cup Fall standout, and the betting favorite, known
                      for elite iron control and performance on coastal layouts.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">
                        Michael Thorbjornsen (+2500):
                      </span>{" "}
                      Top-ranked rookie, coming off strong fall results; his aggressive style and
                      creativity make him a key contender.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Si Woo Kim (+2500):</span> PGA
                      Tour winner and reliable ball striker; his recent starts have him trending as
                      a possible breakthrough pick this week.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Brian Harman (+2800):</span>{" "}
                      Former Open champion, Georgia native, and Seaside Course expert. His precision
                      and putting elevate him in windy fall conditions.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">J.T. Poston (+2800):</span>{" "}
                      Known for hot streaks in late-season events and solid form on bermudagrass
                      greens.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Rico Hoey (+2800):</span> Recent
                      top-five finishes boost his betting appeal, especially on strategic courses
                      like Sea Island.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">
                        Alex Smalley (+3000), Denny McCarthy (+3000):
                      </span>{" "}
                      Both in excellent fall form, strong approach games and past RSM Classic
                      top-10s.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">
                        Thorbjorn Olesen (+3000), Vince Whaley (+3000):
                      </span>{" "}
                      Popular sleeper picks for low scoring and aggressive play.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">
                        Pierceson Coody (+4000), Jake Knapp (+4500):
                      </span>{" "}
                      Young guns near the bubble for Tour card eligibility seeking a breakout
                      performance.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Key Storylines
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">FedEx Cup Finale:</span> This is
                      the last event on the 2025 PGA Tour calendar and the final opportunity for
                      players to secure their Tour cards for 2026.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Tour Card Bubble:</span> Only
                      the top 100 in FedEx Cup points retain full exemption for next season; many
                      players near the cutoff need strong finishes.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Expanded Field:</span> 156
                      players due to the event's two-course format; many local residents and tour
                      regulars in the mix.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Historic Venue:</span> Sea
                      Island, with its wind-exposed layout and unique two-course routing, is known
                      for drama late in the fall season.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Tournament History
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">Defending Champion:</span>{" "}
                      Maverick McNealy (not in field after last year's win), 2022 champion Adam
                      Svensson (+9000) returns.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Local Favorites:</span> Harris
                      English and Brian Harman both expected to contend with local knowledge and
                      recent strong form.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">FedEx Bubble Tension:</span>{" "}
                      Minimum required finishes for full card retention range from top-5 to top-43
                      depending on position.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Course and Format
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">Venue:</span> Sea Island Golf
                      Club (Seaside & Plantation, St. Simons Island, GA), Par 70 / 7,005 yards.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Purse:</span> $7.0 million, with
                      elevated stakes for FedEx Cup bubble players.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Format:</span> 72-hole stroke
                      play, cut after 36 holes.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Broadcast Information
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">TV:</span> Golf Channel (U.S.),
                      PGA Tour Live app.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Thursday, Nov 20:</span> 1–4 PM
                      ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Friday, Nov 21:</span> 1–4 PM ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Saturday, Nov 22:</span> 1–4 PM
                      ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Sunday, Nov 23:</span> 1–3:30 PM
                      ET
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
