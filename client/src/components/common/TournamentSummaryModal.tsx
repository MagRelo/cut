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
                2025 3M Open
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                TPC Twin Cities, Blaine, Minnesota
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                July 24–27, 2025 • 5th annual
              </p>
            </div>

            {/* Scrollable content area */}
            <div className='max-h-[60vh] overflow-y-auto pt-4 px-2 bg-gray-50 pb-8'>
              <div className='prose prose-sm max-w-none'>
                <h3 className='text-2xl font-semibold text-gray-800 mb-2'>
                  History
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Established:</strong> 2019, the 3M Open is a
                    relatively new addition to the PGA Tour schedule but has
                    quickly become popular with players and fans.
                  </li>
                  <li>
                    <strong>Venue:</strong> TPC Twin Cities is known for its
                    lush layout, challenging but fair setup, and a tournament
                    week that typically features favorable summer weather.
                  </li>
                  <li>
                    <strong>Legacy:</strong> Despite its youth, the event has
                    produced exciting finishes and competitive fields each year.
                  </li>
                  <li>
                    <strong>Past Winners:</strong> Michael Thompson (2019),
                    Bryson DeChambeau (2021), Max Homa (2022), Scottie Scheffler
                    (2023), Keegan Bradley (2024).
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  2025 Field & Best Players
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Scottie Scheffler:</strong> World No. 1, defending
                    champion from 2023, and recent dominant form makes him the
                    +450 favorite.
                  </li>
                  <li>
                    <strong>Keegan Bradley:</strong> 2024 champion and recent
                    form (+900 odds).
                  </li>
                  <li>
                    <strong>Patrick Cantlay:</strong> Consistent performer at
                    TPC Twin Cities (+1100).
                  </li>
                  <li>
                    <strong>Max Homa:</strong> Previous winner with solid
                    all-around game (+1500).
                  </li>
                  <li>
                    <strong>Viktor Hovland:</strong> Known for accuracy and
                    putting (+1800).
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TPC Twin Cities:</strong> Par 71, 7,400 yards,
                    characterized by tree-lined fairways, strategically placed
                    bunkers, and fast, undulating greens.
                  </li>
                  <li>
                    <strong>Format:</strong> 72-hole stroke play, with a
                    standard cut after 36 holes.
                  </li>
                  <li>
                    <strong>Course Challenge:</strong> The course rewards
                    precision and short game, with scoring opportunities on
                    par-5s and reachable par-4s.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Scheffler's Dominance:</strong> After winning here
                    in 2023 and maintaining strong form, Scheffler aims to add
                    another title and extend his hot streak on Tour.
                  </li>
                  <li>
                    <strong>Bradley's Momentum:</strong> Fresh off his win at
                    the John Deere Classic, Bradley is looking to carry momentum
                    into Minnesota.
                  </li>
                  <li>
                    <strong>Course Challenge:</strong> TPC Twin Cities demands a
                    balanced game, and players must be sharp around the greens
                    to contend.
                  </li>
                  <li>
                    <strong>Battle for Playoff Positioning:</strong> With the
                    FedExCup playoffs approaching, this event is critical for
                    players looking to improve their standings.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast Information
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TV:</strong> Golf Channel (Thursday–Friday) and CBS
                    (weekend).
                  </li>
                  <li>
                    <strong>Streaming:</strong> PGA Tour Live on ESPN+ and CBS
                    All Access.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Summary Table
                </h3>
                <div className='overflow-x-auto'>
                  <table className='min-w-full border border-gray-300'>
                    <thead>
                      <tr className='bg-gray-100'>
                        <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700'>
                          Aspect
                        </th>
                        <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700'>
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Dates
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          July 24–27, 2025
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Venue
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          TPC Twin Cities, Blaine, Minnesota
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Field Size
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          156
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Defending Champ
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Scottie Scheffler
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Top Favorites
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Scheffler, Keegan Bradley, Patrick Cantlay, Max Homa,
                          Viktor Hovland
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Broadcast
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Golf Channel, CBS, ESPN+, CBS All Access
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
