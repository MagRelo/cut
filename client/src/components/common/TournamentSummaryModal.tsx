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
                2025 FedEx St. Jude Championship
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                TPC Southwind, Memphis, Tennessee
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                August 7–10, 2025 • The opening event of the 2025 FedExCup
                Playoffs
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
                    <strong>Established:</strong> 1967 (as the Westchester
                    Classic), later transitioning to Memphis and rebranded the
                    St. Jude Championship as the FedEx Playoffs opener.
                  </li>
                  <li>
                    <strong>Venue:</strong> TPC Southwind, a challenging course
                    known for penal rough, water threats, and demanding approach
                    shots, has hosted since 2022.
                  </li>
                  <li>
                    <strong>Legacy:</strong> A staple on the PGA Tour and now
                    the gateway to the FedExCup's three-event playoff series.
                    The event raises millions for St. Jude Children's Research
                    Hospital and has featured many world-class champions.
                  </li>
                  <li>
                    <strong>Past Memphis Winners:</strong> Hideki Matsuyama
                    (2024), Will Zalatoris (2023), Tony Finau (2022).
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  2025 Field & Best Players
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Field:</strong> The top 70 players in the FedExCup
                    standings qualify, making it the most competitive lineup of
                    the year—there is no cut, and all players are live for
                    playoff advancement.
                  </li>
                  <li>
                    <strong>Scottie Scheffler:</strong> World No. 1 and
                    defending FedExCup champion, enters as the +280 favorite.
                  </li>
                  <li>
                    <strong>Xander Schauffele:</strong> Consistent playoff
                    performer, second favorite (+1600).
                  </li>
                  <li>
                    <strong>Justin Thomas:</strong> Past FedExCup champ, strong
                    course record (+2200).
                  </li>
                  <li>
                    <strong>Tommy Fleetwood:</strong> Links and playoff
                    specialist (+2500).
                  </li>
                  <li>
                    <strong>Other Notables:</strong> Collin Morikawa, Viktor
                    Hovland, Matt Fitzpatrick, Patrick Cantlay, Jordan Spieth,
                    Hideki Matsuyama.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TPC Southwind:</strong> Par 70, 7,244 yards. Known
                    for tight, tree-lined fairways, numerous water hazards
                    (notably "The Waters of Southwind"), and a layout that
                    punishes inaccuracy.
                  </li>
                  <li>
                    <strong>Format:</strong> 72 holes, no cut. Top 50 in
                    cumulative FedExCup points after this week move on to the
                    BMW Championship; everyone else is eliminated.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Scheffler's Dominance:</strong> Scottie Scheffler
                    enters as both the regular-season points leader and
                    defending champ, aiming to maintain his historic pace.
                  </li>
                  <li>
                    <strong>Playoff Pressure:</strong> For players 40th–70th in
                    points, every shot counts—only the top 50 advance.
                  </li>
                  <li>
                    <strong>Bubble Drama:</strong> Expect pressure-packed
                    moments for stars in danger of missing the BMW (last year
                    the difference was a single stroke).
                  </li>
                  <li>
                    <strong>New Format Impact:</strong> With only three playoff
                    events and smaller fields, a hot week can vault a player
                    toward the Tour Championship.
                  </li>
                  <li>
                    <strong>Charity Impact:</strong> The event's partnership
                    with St. Jude is among the most visible in global golf,
                    adding another layer of meaning to the competition.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast Information
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TV:</strong> Golf Channel (early/Thursday–Friday),
                    NBC (weekend).
                  </li>
                  <li>
                    <strong>Streaming:</strong> PGA Tour Live on ESPN+, Peacock,
                    NBC Sports App.
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
                          August 7–10, 2025
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Venue
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          TPC Southwind, Memphis, Tennessee
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Field Size
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          70 (no cut)
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Defending Champ
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Hideki Matsuyama
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Top Favorites
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Scottie Scheffler, Xander Schauffele, Justin Thomas,
                          Tommy Fleetwood
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Playoff Format
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          First FedExCup Playoff event – only top 50 advance to
                          BMW Championship
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Notable History
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Formerly Westchester Classic, now major PGA Tour
                          playoff event, Memphis host since 2022
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Broadcast
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Golf Channel, NBC, ESPN+, Peacock
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
