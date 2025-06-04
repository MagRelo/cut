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
            <div className='space-y-0.5 pb-4 border-b border-gray-300'>
              <Dialog.Title className='text-3xl font-bold tracking-tight text-gray-900'>
                2025 RBC Canadian Open
              </Dialog.Title>
              <p className='text-md text-gray-600 font-medium'>
                TPC Toronto at Osprey Valley
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                Caledon, Ontario
              </p>
            </div>

            {/* Scrollable content area */}
            <div className='max-h-[60vh] overflow-y-auto pt-4 pr-2 -mr-2'>
              <div className='prose prose-sm max-w-none'>
                <h3 className='text-2xl font-semibold text-gray-800 mb-2'>
                  Best Players and Odds
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Rory McIlroy:</strong> World No. 2 and two-time
                    Canadian Open champion, enters as the favorite (+450 odds).
                  </li>
                  <li>
                    <strong>Ludvig Aberg:</strong> Rising star, strong recent
                    form, +1400 odds.
                  </li>
                  <li>
                    <strong>Corey Conners:</strong> Canadian fan favorite, +1800
                    odds.
                  </li>
                  <li>
                    <strong>Shane Lowry:</strong> Major champion, +1800 odds.
                  </li>
                  <li>
                    <strong>Sam Burns, Robert MacIntyre, Nick Taylor:</strong>{' '}
                    Also among the favorites with odds ranging from +2500 to
                    +4000.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Rory McIlroy:</strong> Chasing a third Canadian Open
                    title, which would put him alongside golf legends Tommy
                    Armour, Sam Snead, and Lee Trevino as three-time winners.
                  </li>
                  <li>
                    <strong>Canadian Hopes:</strong> Corey Conners and Nick
                    Taylor are among the top Canadian players aiming for a home
                    victory.
                  </li>
                  <li>
                    <strong>Preparation for the U.S. Open:</strong> Many players
                    are using this event as a tune-up for the upcoming major
                    championship at Oakmont.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Tournament History
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Tradition:</strong> The RBC Canadian Open is one of
                    the oldest national open golf championships in the world,
                    dating back to 1904.
                  </li>
                  <li>
                    <strong>Recent Champion:</strong> In 2024, Robert MacIntyre
                    won his first PGA Tour title at Hamilton Golf and Country
                    Club, finishing one stroke ahead of Ben Griffin.
                  </li>
                  <li>
                    <strong>Notable Past Winners:</strong> Rory McIlroy (2022,
                    2019), Dustin Johnson, Nick Taylor, and many other major
                    champions.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Course:</strong> TPC Toronto at Osprey Valley (North
                    Course), par 70, 7,389 yards.
                  </li>
                  <li>
                    <strong>First Time:</strong> This is the first time the
                    event is being held at this venue, making course history
                    irrelevant for predictions.
                  </li>
                  <li>
                    <strong>Format:</strong> Standard 72-hole stroke play, with
                    a cut after 36 holes.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast Information
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TV:</strong> Golf Channel and CBS, with coverage in
                    the afternoons and evenings (EDT).
                  </li>
                  <li>
                    <strong>Streaming:</strong> PGA Tour Live on ESPN+,
                    Paramount+, NBC Sports App.
                  </li>
                </ul>
              </div>
            </div>

            <div className='mt-4 flex justify-end'>
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
