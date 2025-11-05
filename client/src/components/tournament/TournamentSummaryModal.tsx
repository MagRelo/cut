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
                      <span className="font-semibold text-gray-900">Ben Griffin (+1000):</span> U.S.
                      Ryder Cup rookie and this week's betting favorite, coming off multiple top
                      finishes in 2025, including a win at the Charles Schwab Challenge.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">J.J. Spaun (+1200):</span> Fresh
                      off his U.S. Open victory and Ryder Cup debut, Spaun's consistent iron play
                      and clutch putting make him a strong contender this week.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Max Greyserman (+2200):</span>{" "}
                      Noted for finishing runner-up at the Baycurrent Classic in Japan recently and
                      placing fourth here last year; his birdie-making ability fits El Cardonal's
                      low-scoring layout.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">
                        Michael Thorbjornsen (+2200):
                      </span>{" "}
                      Coming off recent top-three finishes and known for his power and resilience;
                      he has shown an ability to attack in windy, coastal conditions.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Rico Hoey (+2200):</span>{" "}
                      Trending upward with two top-four finishes in his latest PGA Tour starts,
                      suggesting strong form heading into Mexico.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Si Woo Kim (+2200):</span>{" "}
                      Proven winner and polished ball striker; though recently withdrew, his
                      historical odds place him among the favorites.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Garrick Higgo (+2500):</span>{" "}
                      Arriving hot after top-five results in three straight tournaments, Higgo's
                      scoring potential makes him a strong pick for this event.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Kevin Yu (+2800):</span>{" "}
                      Features on several expert tip sheets for his ball striking and consistent
                      fall form.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Wyndham Clark (+2800):</span>{" "}
                      Former U.S. Open winner with elite long game and motivation to improve his
                      FedEx Cup ranking in the season's final stretch.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Michael Brennan (+3000):</span>{" "}
                      Newly exempt on Tour after his Bank of Utah Championship win, Brennan is seen
                      as a dark horse in his first start as a PGA winner.
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
                      The tournament is a pivotal stop for players aiming to retain or improve their
                      cards for 2026, especially those ranked around No. 100.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Tournament Dates:</span>{" "}
                      November 6–9, 2025, starting Thursday at El Cardonal, part of Diamante Resort,
                      Cabo.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Tiger Woods Design:</span> El
                      Cardonal remains the only regular PGA Tour venue architected by Tiger Woods,
                      offering wide fairways and strategic bunkering.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">International Flavor:</span>{" "}
                      132-player field, including 6 of the top 50 in the OWGR and several new
                      full-status qualifiers from recent fall events.
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
                      Austin Eckroat returns after last year's dramatic 24-under victory, including
                      a final-round 63.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Recent Top Finishers:</span> Max
                      Greyserman (4th last year), Matt Kuchar, and Michael Thorbjornsen have all
                      performed well here recently.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">FedEx Cup Impact:</span> The
                      event directly affects PGA Tour card retention for 2026, especially for those
                      near the cutoff on points.
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
                      Diamante (Los Cabos, Mexico), par 72, 7,452 yards. Features wide paspalum
                      fairways, dramatic elevation, and coastal vistas.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Designer:</span> Tiger Woods,
                      layout emphasizes risk-reward holes and conditions that allow for extremely
                      low scoring if winds are moderate.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Total Purse:</span> $6 million,
                      with a winner's share of about $1,080,000.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Format:</span> Standard 72-hole
                      stroke play with FedEx Cup points allocation.
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
                      extensive Mexico/Latino America coverage.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Thursday, Nov 6:</span> 5–8 PM
                      ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Friday, Nov 7:</span> 5–8 PM ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Saturday, Nov 8:</span>{" "}
                      4:30–7:30 PM ET
                    </li>
                    <li>
                      <span className="font-semibold text-gray-900">Sunday, Nov 9:</span> 4–7 PM ET
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
