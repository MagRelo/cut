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
                2025 John Deere Classic
              </Dialog.Title>
              <p className='text-lg tracking-tight text-gray-600 font-medium'>
                TPC Deere Run
              </p>
              <p className='text-sm text-gray-500 font-medium'>
                Silvis, Illinois • July 3–6, 2025
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
                    <strong>Ben Griffin:</strong> The clear tournament favorite
                    (+1600), with two wins in 2025, six straight top-15
                    finishes, and top-10s at both the PGA Championship and U.S.
                    Open. He's aiming to become a three-time winner this season.
                  </li>
                  <li>
                    <strong>Jason Day:</strong> Former major champion and
                    13-time PGA Tour winner, among the betting favorites at
                    +2200. Day is seeking his first win since 2023 and has shown
                    strong recent form.
                  </li>
                  <li>
                    <strong>Davis Thompson:</strong> Defending champion, set the
                    tournament scoring record in 2024, and aims to become the
                    first back-to-back winner since Steve Stricker. He's priced
                    at +3500.
                  </li>
                  <li>
                    <strong>Rickie Fowler:</strong> Returns for the first time
                    in 15 years, looking to secure FedExCup points and a spot in
                    The Open.
                  </li>
                  <li>
                    <strong>Sungjae Im & Si Woo Kim:</strong> Both top-30 in the
                    world and among the highest-ranked in the field.
                  </li>
                  <li>
                    <strong>Aldrich Potgieter:</strong> Last week's Rocket
                    Mortgage Classic winner, just 20 years old.
                  </li>
                  <li>
                    <strong>Other notables:</strong> Alex Smalley, Emiliano
                    Grillo, Luke Clanton, Chris Gotterup, Keith Mitchell, Kevin
                    Yu - all considered strong contenders or valuable longshots.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Key Storylines
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Ben Griffin's Breakout:</strong> Can he continue his
                    hot streak and claim a third win this season, cementing his
                    status among the Tour's elite?
                  </li>
                  <li>
                    <strong>Back-to-Back Bid:</strong> Will Davis Thompson
                    become the first repeat winner since Stricker's three-peat?
                  </li>
                  <li>
                    <strong>Open Championship Spots:</strong> With The Open at
                    Royal Portrush looming, spots in the field are at stake for
                    top finishers not already exempt.
                  </li>
                  <li>
                    <strong>Wide Open Field:</strong> With many top-ranked
                    players skipping for Open prep, the event is wide
                    open—creating opportunities for rising stars and longshots.
                  </li>
                  <li>
                    <strong>Rickie Fowler's Return:</strong> Fan favorite Fowler
                    is back, seeking a big result to boost his playoff and Open
                    hopes.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Course and Format
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TPC Deere Run:</strong> Par 71, ~7,300 yards. The
                    course is not overly long but rewards aggressive play,
                    precise ball striking, and a hot putter. Expect low scores
                    and a birdie-fest.
                  </li>
                  <li>
                    <strong>Format:</strong> 72 holes, standard PGA Tour cut
                    after 36 holes.
                  </li>
                  <li>
                    <strong>FedExCup Points:</strong> Critical week for players
                    on the playoff bubble, with only five weeks left before the
                    postseason.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Tournament History
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>Origins:</strong> Established in 1971 as the Quad
                    Cities Open; became the John Deere Classic in 1999 after
                    John Deere assumed title sponsorship.
                  </li>
                  <li>
                    <strong>Venue:</strong> Hosted at TPC Deere Run since 2000,
                    a course known for its rolling terrain, elevation changes,
                    and birdie opportunities.
                  </li>
                  <li>
                    <strong>Legacy:</strong> The event is famous for producing
                    first-time winners and low scores. Steve Stricker won three
                    consecutive times (2009–2011), a tournament record.
                  </li>
                  <li>
                    <strong>Community:</strong> Known for its strong charitable
                    impact in the Quad Cities and for providing sponsor
                    exemptions to rising stars.
                  </li>
                  <li>
                    <strong>Past Winners:</strong>
                    <ul className='list-disc pl-5 mt-1'>
                      <li>
                        <strong>2009-2011:</strong> Steve Stricker (three-peat)
                      </li>
                      <li>
                        <strong>2023:</strong> Sepp Straka
                      </li>
                      <li>
                        <strong>2024:</strong> Davis Thompson (tournament
                        scoring record)
                      </li>
                    </ul>
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Broadcast Information
                </h3>
                <ul className='list-disc pl-5 space-y-1.5'>
                  <li>
                    <strong>TV:</strong> Golf Channel and CBS.
                  </li>
                  <li>
                    <strong>Streaming:</strong> PGA Tour Live on ESPN+.
                  </li>
                </ul>

                <h3 className='text-2xl font-semibold text-gray-800 mt-4 mb-2'>
                  Summary
                </h3>
                <div className='bg-white p-4 rounded-lg border border-gray-200'>
                  <table className='w-full text-sm'>
                    <tbody>
                      <tr className='border-b border-gray-100'>
                        <td className='font-semibold py-1'>Dates</td>
                        <td className='py-1'>July 3–6, 2025</td>
                      </tr>
                      <tr className='border-b border-gray-100'>
                        <td className='font-semibold py-1'>Venue</td>
                        <td className='py-1'>
                          TPC Deere Run, Silvis, Illinois
                        </td>
                      </tr>
                      <tr className='border-b border-gray-100'>
                        <td className='font-semibold py-1'>Field Size</td>
                        <td className='py-1'>156</td>
                      </tr>
                      <tr className='border-b border-gray-100'>
                        <td className='font-semibold py-1'>Defending Champ</td>
                        <td className='py-1'>Davis Thompson</td>
                      </tr>
                      <tr className='border-b border-gray-100'>
                        <td className='font-semibold py-1'>Top Favorites</td>
                        <td className='py-1'>
                          Ben Griffin, Jason Day, Davis Thompson
                        </td>
                      </tr>
                      <tr className='border-b border-gray-100'>
                        <td className='font-semibold py-1'>Notable History</td>
                        <td className='py-1'>
                          First played 1971; three-peat by Steve Stricker
                        </td>
                      </tr>
                      <tr>
                        <td className='font-semibold py-1'>Broadcast</td>
                        <td className='py-1'>Golf Channel, CBS, ESPN+</td>
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
