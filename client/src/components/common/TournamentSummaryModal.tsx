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
                2025 BMW Championship
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                Caves Valley Golf Club, Owings Mills, Maryland
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                August 14–17, 2025 • Top 50 in FedExCup standings, no cut
              </p>
            </div>

            {/* Scrollable content area */}
            <div className='max-h-[60vh] overflow-y-auto pt-4 px-2 bg-gray-50 pb-8'>
              <div className='prose prose-sm max-w-none'>
                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Scheffler Chases History:</strong> Scottie Scheffler
                    has led the points from wire to wire; another strong week
                    would place him in commanding position for the FedExCup and
                    PGA Tour Player of the Year.
                  </li>
                  <li>
                    <strong>Rory Returns:</strong> Rory McIlroy, rested after
                    skipping the St. Jude, seeks BMW redemption and a fourth win
                    of 2025 with the Tour Championship and FedExCup in sight.
                  </li>
                  <li>
                    <strong>Cantlay's Course Record:</strong> Patrick Cantlay
                    won here in 2021 and is one of the best playoff competitors
                    of his generation; can he repeat?
                  </li>
                  <li>
                    <strong>Ryder Cup Subplots:</strong> Keegan Bradley (also
                    the U.S. captain), Justin Thomas, and Chris Gotterup could
                    bolster their team chances with a big showing.
                  </li>
                  <li>
                    <strong>Bubble Drama:</strong> Players near 30th in
                    points—like Tommy Fleetwood, Cam Davis, and Adam Scott—must
                    deliver under playoff pressure to advance.
                  </li>
                  <li>
                    <strong>Course Test:</strong> The par-70 setup and increased
                    yardage promise fewer birdies, more defense, and a true
                    challenge for even the longest hitters, an intentional
                    contrast to 2021's low scores.
                  </li>
                  <li>
                    <strong>Surprise Run:</strong> Recent playoff events have
                    crowned unexpected winners. A similar surprise could upend
                    the FedExCup standings.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Best Players & Odds
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Scottie Scheffler:</strong> World No. 1, +220
                    favorite
                  </li>
                  <li>
                    <strong>Rory McIlroy:</strong> +700/+800, returns after
                    missing St. Jude
                  </li>
                  <li>
                    <strong>Xander Schauffele:</strong> +1800, strong playoff
                    record
                  </li>
                  <li>
                    <strong>Ludvig Åberg:</strong> +1800/+2200, emerging talent
                  </li>
                  <li>
                    <strong>Patrick Cantlay:</strong> +1800/+2500, winner here
                    in 2021 and two-time BMW Champion
                  </li>
                  <li>
                    <strong>Others to watch:</strong> Justin Thomas, Collin
                    Morikawa, Tommy Fleetwood, Viktor Hovland, Keegan Bradley,
                    Cameron Young, Chris Gotterup
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mb-2'>
                  History
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Founded:</strong> The BMW traces its lineage to the
                    Western Open (1899), rebranded in 2007 as the BMW
                    Championship and now the penultimate playoff event on the
                    PGA Tour.
                  </li>
                  <li>
                    <strong>Venue:</strong> Caves Valley returns as host for the
                    first time since 2021, but this year plays tougher: set up
                    as a par 70 (formerly par 72), stretched to 7,601 yards to
                    challenge even the world's longest hitters.
                  </li>
                  <li>
                    <strong>Legacy:</strong> Previously, 70 qualified; now only
                    50 make the field, with no 36-hole cut. The top 30 after
                    this week move on to the Tour Championship for the FedExCup.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Caves Valley GC:</strong> Par 70, 7,601 yards
                    (toughened since 2021's 27-under winning total; now expected
                    closer to -19). Northeast-style bentgrass layout rewards
                    great drivers, long-iron play, and nerve on quick greens.
                  </li>
                  <li>
                    <strong>No Cut:</strong> All 50 play four rounds. Top 30 in
                    FedExCup points after this event reach the Tour
                    Championship.
                  </li>
                  <li>
                    <strong>FedExCup Playoff Stakes:</strong> With only three
                    playoff events, every shot and position matters. Big swings
                    in points possible; a hot week can send a player to East
                    Lake or knock them out.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast Times and How To Watch
                </h3>
                <div className='overflow-x-auto'>
                  <table className='min-w-full border border-gray-300 mb-4'>
                    <thead>
                      <tr className='bg-gray-100'>
                        <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700'>
                          Date
                        </th>
                        <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700'>
                          Time (ET)
                        </th>
                        <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700'>
                          Coverage
                        </th>
                        <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700'>
                          Network/Streaming
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Thurs, Aug 14
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          2:00 p.m.–6:00 p.m.
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Live Round 1
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Golf Channel, NBC Sports App
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Fri, Aug 15
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          2:00 p.m.–6:00 p.m.
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Live Round 2
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Golf Channel, NBC Sports App
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Sat, Aug 16
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          1:00 p.m.–3:00 p.m.
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Early Live (Round 3)
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Golf Channel, NBC Sports App
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Sat, Aug 16
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          3:00 p.m.–6:00 p.m.
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Live Weekend (Round 3)
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          NBC, Peacock
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Sun, Aug 17
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Noon–2:00 p.m.
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Early Final Round
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Golf Channel
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Sun, Aug 17
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          2:00 p.m.–6:00 p.m.
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Live Final Round
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          NBC, Peacock
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          All Days
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          9:00 a.m.–6:00 p.m.
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          Featured Groups
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          ESPN+ (PGA Tour Live)
                        </td>
                      </tr>
                      <tr>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          All Days
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          1:00 p.m.–6:00 p.m.
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          PGA Tour Radio
                        </td>
                        <td className='border border-gray-300 px-3 py-2 text-sm text-gray-900'>
                          SiriusXM
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
