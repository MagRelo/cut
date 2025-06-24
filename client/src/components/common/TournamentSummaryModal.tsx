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
                2025 Rocket Mortgage Classic
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                Detroit Golf Club
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                Detroit, Michigan
              </p>
            </div>

            {/* Scrollable content area */}
            <div className='max-h-[60vh] overflow-y-auto pt-4 px-2 bg-gray-50 pb-8'>
              <div className='prose prose-sm max-w-none'>
                <h3 className='text-2xl font-semibold text-gray-800 mb-2'>
                  Field & Best Players
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    The 2025 field features <strong>156 players</strong>,
                    including <strong>10 major champions</strong> and{' '}
                    <strong>12 of the top 50 in the world rankings</strong>.
                  </li>
                  <li>
                    <strong>Collin Morikawa:</strong> World No. 4, two-time
                    major winner, 2023 runner-up, and this week's betting
                    favorite at 12-1 odds.
                  </li>
                  <li>
                    <strong>Keegan Bradley:</strong> 2025 Travelers Champion,
                    16-1 odds.
                  </li>
                  <li>
                    <strong>Patrick Cantlay:</strong> 18-1 odds, consistent
                    top-20 performer.
                  </li>
                  <li>
                    <strong>Ben Griffin:</strong> 22-1 odds, rising star.
                  </li>
                  <li>
                    <strong>Hideki Matsuyama:</strong> 2021 Masters winner, top
                    15 in the world.
                  </li>
                  <li>
                    <strong>Cameron Davis:</strong> Defending champion and only
                    two-time winner of this event, but a longshot to repeat at
                    80-1 odds.
                  </li>
                  <li>
                    <strong>Other notables:</strong> Matt Fitzpatrick, Cameron
                    Young (two top-6 finishes here), Chris Kirk (strong recent
                    form), Alex Smalley, Nicolai Højgaard, Michael Thorbjornsen,
                    Lee Hodges.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Can Cameron Davis make history?</strong> He's the
                    only two-time winner and aims to become the first to
                    successfully defend his Rocket Mortgage Classic title.
                  </li>
                  <li>
                    <strong>Morikawa's quest:</strong> The favorite has strong
                    course history (runner-up in 2023) but hasn't won in the
                    U.S. since 2021 and has struggled with putting recently.
                  </li>
                  <li>
                    <strong>Keegan Bradley's momentum:</strong> Fresh off a
                    dramatic win at the Travelers, Bradley is in form and
                    looking to add another title.
                  </li>
                  <li>
                    <strong>Breakthrough potential:</strong> Several young stars
                    (Cameron Young, Ben Griffin) and longshots (Chris Kirk, Alex
                    Smalley) are poised for a breakthrough.
                  </li>
                  <li>
                    <strong>Detroit's impact:</strong> The tournament continues
                    to support local charities and digital inclusion initiatives
                    in Detroit.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Detroit Golf Club:</strong> Par 72, ~7,300 yards,
                    favoring long hitters and aggressive play.
                  </li>
                  <li>
                    <strong>Setup:</strong> 13 "driver holes," little penalty
                    for missed fairways—perfect for bombers.
                  </li>
                  <li>
                    <strong>Format:</strong> 72 holes, standard PGA Tour cut
                    after 36 holes.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Tournament History
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Origins:</strong> The Rocket Mortgage Classic
                    debuted in 2019, marking the first PGA Tour event held
                    within Detroit city limits. It is played at the historic
                    Detroit Golf Club, which features two Donald Ross-designed
                    courses.
                  </li>
                  <li>
                    <strong>Course Character:</strong> Notable for its low
                    scoring and "bomber-friendly" setup, the event has quickly
                    become a favorite for aggressive, long-hitting players.
                  </li>
                  <li>
                    <strong>Past Winners:</strong>
                    <ul className='list-disc pl-5 mt-1'>
                      <li>
                        <strong>2019:</strong> Nate Lashley (wire-to-wire, -25)
                      </li>
                      <li>
                        <strong>2020:</strong> Bryson DeChambeau (-23)
                      </li>
                      <li>
                        <strong>2021:</strong> Cameron Davis (playoff, -18)
                      </li>
                      <li>
                        <strong>2022:</strong> Tony Finau (-26)
                      </li>
                      <li>
                        <strong>2023:</strong> Rickie Fowler (playoff, -24)
                      </li>
                      <li>
                        <strong>2024:</strong> Cameron Davis (second win, -18)
                      </li>
                    </ul>
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast and Tickets
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TV:</strong> Golf Channel and CBS.
                  </li>
                  <li>
                    <strong>Tickets:</strong> Available, with daily grounds and
                    hospitality options.
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
