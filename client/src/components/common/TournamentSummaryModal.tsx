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
                2025 Open Championship
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                Royal Portrush Golf Club
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                Northern Ireland
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
                    <strong>Scottie Scheffler:</strong> World No. 1, seeking his
                    first Open title and fourth career major. The pre-tournament
                    favorite (+450 to +500 odds).
                  </li>
                  <li>
                    <strong>Rory McIlroy:</strong> Northern Ireland native,
                    homecoming hero, and 2014 Open champion. Second favorite
                    (+700), looking to win on home soil, already a Masters
                    winner in 2025.
                  </li>
                  <li>
                    <strong>Jon Rahm:</strong> 2021 U.S. Open champion.
                    Consistent major contender (+1200).
                  </li>
                  <li>
                    <strong>Bryson DeChambeau:</strong> Known for his power,
                    two-time U.S. Open winner, odds around +1400 to +2000.
                  </li>
                  <li>
                    <strong>Xander Schauffele:</strong> Defending champion
                    (+2000/+2500), seeking to go back-to-back after last year's
                    breakthrough.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Tournament History
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Established:</strong> 1860, The Open Championship
                    ("The Open") is the world's oldest golf major.
                  </li>
                  <li>
                    <strong>Venue:</strong> This is only the third time Royal
                    Portrush has hosted The Open (previously 1951 and 2019).
                  </li>
                  <li>
                    <strong>Legacy:</strong> Renowned for its links challenge,
                    unpredictable weather, and status as golf's "original
                    major." Shane Lowry won the last Open held at Portrush
                    (2019).
                  </li>
                  <li>
                    <strong>Recent Champions:</strong> 2024: Xander Schauffele
                    (Royal Troon), 2023: Brian Harman (Royal Liverpool), 2022:
                    Cameron Smith (St Andrews).
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>McIlroy's Homecoming:</strong> The pressure and
                    opportunity for a popular home win, especially after missing
                    the cut here in 2019.
                  </li>
                  <li>
                    <strong>Scheffler's Spectacular Season:</strong> Can he cap
                    a dominant year with another major?
                  </li>
                  <li>
                    <strong>Schauffele's Defense:</strong> Looking to win
                    consecutive majors and further cement his status as one of
                    golf's elite.
                  </li>
                  <li>
                    <strong>Open Specialists:</strong> Will links experts and
                    Europeans thrive, or can an American grab the Claret Jug
                    again?
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Course:</strong> Royal Portrush (Dunluce Links): Par
                    71, 7,381 yards. Classic links: undulating fairways, deep
                    bunkers, thick rough, coastal winds, and demanding greens.
                  </li>
                  <li>
                    <strong>Format:</strong> 72 holes of stroke play, starting
                    field of 156. Cut after 36 holes (top 70 and ties). The
                    venue has been lengthened and enhanced since 2019, promising
                    a tougher test.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast Information
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TV:</strong> USA Network (early rounds), NBC
                    (weekend).
                  </li>
                  <li>
                    <strong>Streaming:</strong> Peacock, Fubo.
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
