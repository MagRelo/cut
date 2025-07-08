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
                2025 Genesis Scottish Open
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                The Renaissance Club
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                East Lothian, Scotland
              </p>
            </div>

            {/* Scrollable content area */}
            <div className='max-h-[60vh] overflow-y-auto pt-4 px-2 bg-gray-50 pb-8'>
              <div className='prose prose-sm max-w-none'>
                <h3 className='text-2xl font-semibold text-gray-800 mb-2'>
                  Best Players and Odds
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Rory McIlroy:</strong> World No. 2, multiple
                    Scottish Open winner, and this week's favorite (+450).
                  </li>
                  <li>
                    <strong>Ludvig Åberg:</strong> Rising star, already a winner
                    on both sides of the Atlantic (+1200).
                  </li>
                  <li>
                    <strong>Tommy Fleetwood:</strong> Consistent performer and
                    links specialist (+1500).
                  </li>
                  <li>
                    <strong>Viktor Hovland:</strong> Major contender, known for
                    his aggressive play (+1800).
                  </li>
                  <li>
                    <strong>Collin Morikawa:</strong> Top-ranked American, Open
                    champion, and a threat on any links course (+2000).
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Tournament History
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Established:</strong> 1972, the Scottish Open is a
                    premier event on the DP World Tour and a key part of the PGA
                    Tour's summer schedule.
                  </li>
                  <li>
                    <strong>Venue:</strong> The Renaissance Club has hosted
                    since 2019, offering a modern links challenge on Scotland's
                    east coast.
                  </li>
                  <li>
                    <strong>Significance:</strong> Traditionally serves as the
                    final tune-up for The Open Championship, attracting a
                    world-class field and providing a true links golf test.
                  </li>
                  <li>
                    <strong>Legacy:</strong> The event has seen champions from
                    both sides of the Atlantic, with many using it as a
                    springboard to Open success.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Rory McIlroy's Pursuit:</strong> Can McIlroy add
                    another Scottish Open title to his illustrious resume?
                  </li>
                  <li>
                    <strong>Open Championship Prep:</strong> Many players use
                    this week as their final tune-up before The Open, testing
                    their games in true links conditions.
                  </li>
                  <li>
                    <strong>Course Challenge:</strong> The Renaissance Club's
                    layout rewards shot-making and strategic play, with weather
                    often playing a decisive role.
                  </li>
                  <li>
                    <strong>Scottish Hopes:</strong> Local players have extra
                    motivation to perform in front of home crowds, aiming for a
                    breakthrough victory.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Course:</strong> The Renaissance Club: Par 71,
                    approximately 7,200 yards. The course demands creativity,
                    precision, and adaptability to changing coastal conditions.
                  </li>
                  <li>
                    <strong>Format:</strong> 72-hole stroke play with a cut
                    after 36 holes. The field features 156 players, including
                    many of the world's best.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast Information
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TV:</strong> Golf Channel and European Tour live
                    coverage.
                  </li>
                  <li>
                    <strong>Streaming:</strong> Official platforms offer
                    comprehensive streaming options for fans worldwide.
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
