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
                2025 World Wide Technology Championship
              </DialogTitle>
              <p className="text-sm font-semibold text-gray-700">El Cardonal at Diamante</p>
              <p className="text-xs text-gray-500 font-medium">Los Cabos, Mexico</p>
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
                      <span className="font-semibold text-gray-900">Cameron Young (+1400):</span>{" "}
                      Strongest-ranked player in the field, favored for his power off the tee and
                      ability to score on wide, modern layouts. Recent fall performances have made
                      him a key target for bettors.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Matt Fitzpatrick (+1600):</span>{" "}
                      Former US Open champion with elite ball-striking and adaptability in windy
                      coastal Mexican conditions. Has multiple top-15 fall finishes, making him a
                      reliable pick this week.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Sahith Theegala (+1800):</span>{" "}
                      Talented young star who thrives on aggressive courses. His recent late-season
                      form includes several top-10s, positioning him as a strong contender in Cabo.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Ludvig Åberg (+2000):</span> One
                      of the Tour's rising talents, known for long irons and controlled aggression.
                      His skill set matches El Cardonal's risk-reward holes; seen as a smart bet for
                      breakout performance.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Adam Svensson (+2200):</span>{" "}
                      Canadian standout with past success in Mexico. Recent results highlight his
                      consistency and putting prowess on paspalum greens, making him a popular
                      sleeper selection.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Erik van Rooyen (+2500):</span>{" "}
                      Defending champion after his surge to victory in 2024. Familiarity with El
                      Cardonal and a proven record in coastal events give him a statistical edge.
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
                      The event is a marquee stop in the FedEx Cup Fall, providing players vital
                      chances to reclaim or improve PGA Tour cards heading into 2026.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Tournament Dates:</span> October
                      30–November 2, 2025, marking the second edition at El Cardonal.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Tiger Woods Design:</span> El
                      Cardonal is the first Tiger Woods-designed course used for a regular PGA Tour
                      event, spotlighting strategic bunkering and expansive fairways.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Course Setup:</span> Organizers
                      have kept rough penalties light and the greens receptive, expecting low scores
                      in consistent, breezy conditions typical of late fall in Cabo.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Tournament History
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">Defending Champion:</span> Erik
                      van Rooyen claimed the 2024 title with a closing round 63, finishing two
                      strokes ahead of Matt Kuchar.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Recent Top Finishers:</span>{" "}
                      Matt Kuchar (2nd) and Justin Suh (3rd) posted strong results in 2024.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Tour History:</span> The event
                      moved in 2023 to El Cardonal after years at Mayakoba, aligning with the Tour's
                      focus on unique international venues for the fall series.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Course and Format
                  </h3>
                  <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-700">
                    <li>
                      <span className="font-semibold text-gray-900">Course:</span> El Cardonal at
                      Diamante (Los Cabos, Mexico), par 72, 7,452 yards.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Designer:</span> Tiger Woods;
                      layout emphasizes strategy with dramatic elevation changes and panoramic
                      Pacific views, making it one of the most modern venues in the Fall Series.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Total Purse:</span> $8.7 million
                      with a winner's share of $1,566,000.
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
                      <span className="font-semibold text-gray-900">Thursday, Oct 30:</span> 5–8 PM
                      ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Friday, Oct 31:</span> 5–8 PM ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Saturday, Nov 1:</span>{" "}
                      4:30–7:30 PM ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Sunday, Nov 2:</span> 4–7 PM ET
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
