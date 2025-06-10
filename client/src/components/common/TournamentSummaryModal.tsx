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
                2025 U.S. Open Championship
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                Oakmont Country Club
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                Oakmont, Pennsylvania
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
                    <strong>Scottie Scheffler:</strong> World No. 1, three-time
                    major champion, enters as the heavy favorite (11/4 odds).
                    Scheffler has won three of his last four starts, including
                    the PGA Championship and the Memorial, and is seeking his
                    fourth career major and the third leg of the career grand
                    slam.
                  </li>
                  <li>
                    <strong>Bryson DeChambeau:</strong> Defending champion,
                    two-time U.S. Open winner, and second favorite at 15/2 odds.
                    He's been in excellent form and has prepared specifically
                    for Oakmont's challenges.
                  </li>
                  <li>
                    <strong>Rory McIlroy:</strong> World No. 2, Masters champion
                    this year, and third favorite at 11-1 odds. A win would give
                    him his sixth major and further cement his legacy.
                  </li>
                  <li>
                    <strong>Jon Rahm:</strong> 2021 U.S. Open champion, 12-1
                    odds, showing a resurgence in form and always a threat at
                    majors.
                  </li>
                  <li>
                    <strong>Xander Schauffele:</strong> 2024 PGA Championship
                    winner, 18-1 odds, consistently contending in majors.
                  </li>
                  <li>
                    <strong>Other Notable Contenders:</strong> Collin Morikawa,
                    Ludvig Åberg, Joaquin Niemann, Tommy Fleetwood, Justin
                    Thomas, Shane Lowry, and Patrick Cantlay.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Scheffler's Dominance:</strong> Can Scheffler
                    continue his incredible run and win back-to-back majors,
                    joining an elite group of golfers to achieve this feat?
                  </li>
                  <li>
                    <strong>DeChambeau's Defense:</strong> Will the defending
                    champion's power and preparation help him conquer Oakmont's
                    brutal setup again?
                  </li>
                  <li>
                    <strong>McIlroy's Quest:</strong> McIlroy seeks his sixth
                    major and another step toward golf immortality.
                  </li>
                  <li>
                    <strong>Phil Mickelson's Last Chance?:</strong> Mickelson,
                    possibly playing his final U.S. Open, still seeks the
                    elusive career Grand Slam.
                  </li>
                  <li>
                    <strong>Oakmont's Challenge:</strong> The course itself is a
                    central figure—its greens, rough, and history promise drama
                    and potential heartbreak.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  History and Significance
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Tradition:</strong> The U.S. Open is one of golf's
                    four major championships, staged annually by the United
                    States Golf Association (USGA).
                  </li>
                  <li>
                    <strong>Heritage:</strong> First played in 1895, it is
                    renowned for its challenging setups, tough scoring, and the
                    prestige attached to winning America's national
                    championship.
                  </li>
                  <li>
                    <strong>Milestone:</strong> This year marks the 125th
                    edition, hosted at Oakmont Country Club in Pennsylvania—a
                    venue famous for its lightning-fast, undulating greens and
                    penal rough. Oakmont is hosting the U.S. Open for a record
                    10th time, underscoring its status as one of the sternest
                    tests in golf.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Venue: Oakmont Country Club
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Course Challenge:</strong> Oakmont is legendary for
                    its difficulty, featuring the "scariest" greens in golf,
                    thick rough, and the longest par-three in major history.
                  </li>
                  <li>
                    <strong>Design Philosophy:</strong> The course is designed
                    to expose any weakness in a player's game, demanding
                    precision, patience, and mental toughness.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Field and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Competition:</strong> 156 players are set to compete
                    over 72 holes of stroke play.
                  </li>
                  <li>
                    <strong>Cut:</strong> The cut comes after 36 holes, with the
                    top 60 and ties advancing to the weekend.
                  </li>
                  <li>
                    <strong>Prize:</strong> The winner receives a significant
                    share of the prize fund and a major boost in world ranking
                    and career legacy.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast Information
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Dates:</strong> June 12–15, 2025
                  </li>
                  <li>
                    <strong>TV:</strong> NBC and USA Network provide extensive
                    coverage, with NBC offering the most broadcast hours ever
                    for a major.
                  </li>
                  <li>
                    <strong>Streaming:</strong> Coverage available via NBC
                    Sports digital platforms and Peacock.
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
