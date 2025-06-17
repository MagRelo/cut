import React from 'react';
import { Dialog } from '@headlessui/react';

interface TournamentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TournamentSummaryModal: React.FC<TournamentSummaryModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
      {/* Background overlay */}
      <div className='fixed inset-0 bg-black/30' aria-hidden='true' />

      {/* Modal container */}
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <Dialog.Panel className='mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg'>
          <div className='p-4 sm:p-6 border-b border-gray-200'>
            <div className='space-y-0.5 pb-2 border-b border-gray-300'>
              <Dialog.Title className='text-3xl font-bold tracking-tight text-gray-900'>
                2025 Travelers Championship
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                TPC River Highlands
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                Cromwell, Connecticut
              </p>
            </div>

            {/* Scrollable content area */}
            <div className='max-h-[60vh] overflow-y-auto pt-4 px-2 bg-gray-50 pb-8'>
              <div className='prose prose-sm max-w-none'>
                <h3 className='text-2xl font-semibold text-gray-800 mb-2'>
                  Top Players and Odds
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Scottie Scheffler:</strong> Defending champion,
                    World No. 1, enters as the +280 favorite after winning last
                    year in a playoff over Tom Kim.
                  </li>
                  <li>
                    <strong>Rory McIlroy:</strong> World No. 2, +1100 odds,
                    seeking his first Travelers title.
                  </li>
                  <li>
                    <strong>Xander Schauffele:</strong> +1200 odds, always a
                    contender at TPC River Highlands.
                  </li>
                  <li>
                    <strong>Collin Morikawa & Ludvig Åberg:</strong> Both at
                    +2000 odds.
                  </li>
                  <li>
                    <strong>Other Notables:</strong> Justin Thomas (+2200),
                    Patrick Cantlay (+2200), Viktor Hovland (+3500), Corey
                    Conners (+4000), J.J. Spaun (+5000, fresh off a U.S. Open
                    win), Tom Kim (+9000, last year's runner-up).
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Scheffler's Dominance:</strong> Can Scottie
                    Scheffler defend his title and add to his already historic
                    season after winning six times last year, including this
                    event in a playoff?
                  </li>
                  <li>
                    <strong>McIlroy's Pursuit:</strong> Rory McIlroy looks to
                    bounce back after the U.S. Open and capture his first
                    Travelers title.
                  </li>
                  <li>
                    <strong>U.S. Open Fallout:</strong> Several stars, including
                    new major champion J.J. Spaun, are in the field just days
                    after a grueling U.S. Open at Oakmont.
                  </li>
                  <li>
                    <strong>Drama at TPC River Highlands:</strong> The course is
                    famous for wild finishes—Jordan Spieth's walk-off bunker
                    shot in 2017 and Jim Furyk's record 58 in 2016.
                  </li>
                  <li>
                    <strong>Fan Experience:</strong> The Travelers is one of the
                    most attended and fan-friendly events on Tour, second only
                    to the Phoenix Open.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Course:</strong> TPC River Highlands
                    <ul className='list-disc pl-5 mt-1'>
                      <li>
                        Par 70, 6,844 yards—short by Tour standards but demands
                        precision and rewards aggressive play.
                      </li>
                      <li>
                        Known for dramatic risk-reward holes, especially on the
                        closing stretch.
                      </li>
                      <li>
                        No cut due to Signature Event status; all 72 players
                        compete through Sunday.
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>Signature Event:</strong> Elevated purse and
                    FedExCup points (700 to the winner).
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Tournament History
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Origins:</strong> Established in 1952 as the
                    Insurance City Open, renamed the Greater Hartford Open in
                    1967, and has been the Travelers Championship since 2007.
                  </li>
                  <li>
                    <strong>Venue:</strong> TPC River Highlands has hosted since
                    1984 and is known for fan engagement and dramatic finishes.
                    The course record is 58, set by Jim Furyk in 2016—the lowest
                    round in PGA Tour history.
                  </li>
                  <li>
                    <strong>Notable Past Winners:</strong> Billy Casper (4
                    wins), Bubba Watson (3), Phil Mickelson, Arnold Palmer, Paul
                    Azinger, Stewart Cink, and more.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast and Streaming
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TV:</strong> Golf Channel (Thursday/Friday: 3–6 p.m.
                    ET; Saturday/Sunday: 1–3 p.m. ET), CBS (Saturday: 3–6:30
                    p.m. ET, Sunday: 3–6 p.m. ET).
                  </li>
                  <li>
                    <strong>Streaming:</strong> PGA Tour Live on ESPN+ (early
                    coverage), Paramount+ (CBS simulcast), NBC Sports App (Golf
                    Channel simulcast).
                  </li>
                </ul>
              </div>
            </div>

            <div className='pt-4 border-t border-gray-300 flex justify-end'>
              <button
                onClick={onClose}
                className='px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2'>
                Close
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
