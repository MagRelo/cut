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
                2025 Wyndham Championship
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                Sedgefield Country Club, Greensboro, North Carolina
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                July 30–August 3, 2025 • 86th annual
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
                    <strong>Established:</strong> 1938 (originally the Greater
                    Greensboro Open), the seventh-oldest event on the PGA Tour.
                  </li>
                  <li>
                    <strong>Venue:</strong> Sedgefield Country Club, a Donald
                    Ross-designed course, has hosted since 2008 and was part of
                    the tournament's early years, featuring a classic layout
                    rewarding precision and iron play.
                  </li>
                  <li>
                    <strong>Legacy:</strong> Sam Snead holds the all-time record
                    with eight wins, the most at any one PGA Tour event. The
                    event has been a showcase for both legends (Byron Nelson,
                    Ben Hogan, Seve Ballesteros, Gary Player) and breakthrough
                    winners. It's known for drama, low scores, and was the first
                    PGA event in the South to allow Black players (Charlie
                    Sifford, 1961).
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  2025 Field & Best Players
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Field:</strong> 156 players, many outside the
                    world's top rankings as stars have largely locked FedExCup
                    spots.
                  </li>
                  <li>
                    <strong>Matt Fitzpatrick:</strong> (+2000), the favorite
                    after a strong summer and recent top-5 finish at The Open.
                  </li>
                  <li>
                    <strong>Ben Griffin, Keegan Bradley:</strong> Both at +2500;
                    Bradley is the only current top-10 ranked player in the
                    field and a fan favorite.
                  </li>
                  <li>
                    <strong>Major Champions:</strong> Jordan Spieth (+3000),
                    Hideki Matsuyama (+3300), Adam Scott (+4500).
                  </li>
                  <li>
                    <strong>Other notables:</strong> Aaron Rai (+2000 to +2500),
                    Robert MacIntyre (+2800), Si Woo Kim (+3000), Tom Kim,
                    Rickie Fowler (+5000), Akshay Bhatia, Lucas Glover, Jake
                    Knapp, Luke Clanton, Harry Hall, Kurt Kitayama.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Sedgefield Country Club:</strong> Par 70,
                    approximately 7,127 yards. Classic Donald Ross design with
                    tree-lined fairways, slick greens, only two par-5s, and a
                    layout favoring accuracy and iron play over power.
                  </li>
                  <li>
                    <strong>Format:</strong> 72-hole stroke play, standard Tour
                    cut after 36 holes (top 65 and ties advance for the
                    weekend).
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>FedExCup Playoffs Bubble:</strong> This is the final
                    event of the regular season—only the top 70 in the FedExCup
                    standings qualify for the playoffs, so for many players,
                    this week is must-perform.
                  </li>
                  <li>
                    <strong>Breakthrough Potential:</strong> With most top stars
                    absent, there's a prime chance for a breakthrough
                    winner—eight of the last 10 Tour events featured a first- or
                    second-time winner.
                  </li>
                  <li>
                    <strong>Bradley's Playoff Push:</strong> Keegan Bradley aims
                    to solidify or improve his playoff and Ryder Cup standing.
                  </li>
                  <li>
                    <strong>Spieth & Matsuyama:</strong> Both major champions
                    seek crucial points and momentum with playoffs and Cup
                    captain's picks looming.
                  </li>
                  <li>
                    <strong>Signature Event Access:</strong> The top 50 after
                    the second FedExCup Playoff secure entry to next year's $20
                    million events.
                  </li>
                  <li>
                    <strong>Tour History:</strong> The tournament's rich
                    tradition, Hall of Fame alumni, and unique place as a
                    "last-chance saloon" for playoff hopefuls.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast Information
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TV:</strong> Golf Channel (all rounds, early/NBC
                    simulcast), CBS (final two rounds).
                  </li>
                  <li>
                    <strong>Streaming:</strong> PGA Tour Live on ESPN+, CBS All
                    Access, official tournament website coverage.
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
                          July 30–August 3, 2025
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Venue
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Sedgefield Country Club, Greensboro, NC
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
                          Aaron Rai
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Top Favorites
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Fitzpatrick, Ben Griffin, Keegan Bradley, Jordan
                          Spieth, Hideki Matsuyama, Adam Scott
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Tour Significance
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Final FedExCup regular season event, last playoff
                          qualifying chance
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Notable History
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Sam Snead's eight wins; 19 Hall of Fame champions;
                          first Black player in South (1961)
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
