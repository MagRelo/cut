import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";

export const FAQPage: React.FC = () => {
  return (
    <div className="p-4">
      <PageHeader title="FAQ" className="mb-3" />

      {/* Quick Navigation */}
      <div className="bg-white rounded-sm shadow p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 font-display">Jump to Section</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <a href="#gameplay" className="text-blue-600 hover:underline">
              Gameplay
            </a>
          </li>
          <li>
            <a href="#contest-status" className="text-blue-600 hover:underline">
              Contest Status & Timeline
            </a>
          </li>
          <li>
            <a href="#account" className="text-blue-600 hover:underline">
              Account & Wallet
            </a>
          </li>
          <li>
            <a href="#contracts" className="text-blue-600 hover:underline">
              Smart Contracts
            </a>
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        {/* Gameplay Section */}
        <div id="gameplay" className="bg-white rounded-sm shadow p-6 scroll-mt-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-display">Gameplay</h2>

          <div className="space-y-4">
            {/* Scoring System */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How does scoring work?</h3>
              <p className="text-gray-700 mb-2">
                The Cut uses a Modified Stableford scoring system where players earn points based on
                their performance on each hole:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Hole-in-one: +10 points</li>
                <li>Double Eagle or better: +15 points</li>
                <li>Eagle: +5 points</li>
                <li>Birdie: +2 points</li>
                <li>Par: 0 points</li>
                <li>Bogey: -1 point</li>
                <li>Double bogey or worse: -3 points</li>
              </ul>
            </div>

            {/* Bonus Points */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Are there bonus points?</h3>
              <p className="text-gray-700 mb-2">Yes! Players can earn bonus points:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Making the cut: +3 points</li>
                <li>1st place finish: +10 points</li>
                <li>2nd place finish: +5 points</li>
                <li>3rd place finish: +3 points</li>
              </ul>
            </div>

            {/* Creating a Lineup */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do I create a lineup?
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Navigate to the Lineups page</li>
                <li>Click "Create Lineup"</li>
                <li>Select 4 golfers from the available players</li>
                <li>Save your lineup before the tournament starts</li>
                <li>You can create multiple lineups for different contests</li>
              </ul>
            </div>

            {/* Contests */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How do contests work?</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>
                  Contests are competitions where users enter lineups for a specific tournament
                </li>
                <li>Each contest has an entry fee (paid in CUT tokens)</li>
                <li>Entry fees create a prize pool distributed to winners</li>
                <li>Lineups lock when the tournament begins</li>
              </ul>
            </div>

            {/* Leaderboard */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How are winners determined?
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Your lineup's total score is the sum of all 4 golfers' Stableford points</li>
                <li>
                  Rankings update as the tournament progresses (every 5 minutes during active play)
                </li>
                <li>The highest scoring lineups win prizes based on contest payout structure</li>
                <li>Ties are split evenly among tied participants</li>
              </ul>
            </div>

            {/* Payout Structure */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What is the payout structure?
              </h3>
              <p className="text-gray-700 mb-2">
                Payouts are determined by the number of participants in the contest:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-sm border border-gray-200 p-3">
                  <div className="font-semibold text-gray-900 mb-2">
                    Large Contests (10+ participants):
                  </div>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>1st Place: 70%</li>
                    <li>2nd Place: 20%</li>
                    <li>3rd Place: 10%</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-sm border border-gray-200 p-3">
                  <div className="font-semibold text-gray-900 mb-2">
                    Small Contests (fewer than 10 participants):
                  </div>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>1st Place: 100% (winner takes all)</li>
                  </ul>
                </div>
              </div>
              <p className="text-gray-700 mt-2 text-sm">
                Note: A small oracle fee (typically 5%) is deducted from the prize pool to cover
                tournament result verification costs.
              </p>
            </div>
          </div>
        </div>

        {/* Contest Status & Timeline Section */}
        <div id="contest-status" className="bg-white rounded-sm shadow p-6 scroll-mt-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-display">
            Contest Status & Timeline
          </h2>

          <div className="space-y-4">
            {/* Status Lifecycle */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What are the contest status stages?
              </h3>
              <p className="text-gray-700 mb-3">
                Contests progress through the following lifecycle:
              </p>
              <div className="bg-gray-50 rounded-sm border border-gray-200 p-4 mb-3">
                <code className="text-sm text-gray-800">
                  OPEN → ACTIVE → LOCKED → SETTLED → CLOSED
                </code>
                <div className="mt-2 text-sm text-gray-600">
                  Note: Contests can be CANCELLED from any pre-SETTLED state
                </div>
              </div>
            </div>

            {/* Weekly Timeline */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens at each stage?
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
                        Day/Time
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
                        Event
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
                        What Happens
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                        Monday Morning
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        Contest Created
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                          OPEN
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        Contest becomes available. Users can join/leave, build lineups, buy shares.
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                        Thursday Morning
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        Tournament Starts
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                          ACTIVE
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        Entries locked (no join/leave). Prediction market stays open (buy only).
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                        Sunday Morning
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        Final Round (R4) Starts
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                          LOCKED
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        All positions frozen. Prediction market closed. Awaiting final results.
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                        Sunday Evening
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        Tournament Complete
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                          SETTLED
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        Results finalized. Winners can claim primary and secondary payouts.
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                        Following Sunday
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        Expiry Reached
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
                          CLOSED
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-700">
                        Contest archived. All claims processed or forfeited.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What can I do at each status?
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-sm border border-gray-200 p-3">
                  <div className="font-semibold text-gray-900 mb-2">
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold mr-2">
                      OPEN
                    </span>
                    Full Access
                  </div>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Join or leave the contest</li>
                    <li>Create and edit lineups</li>
                    <li>Buy shares in the prediction market</li>
                    <li>Sell shares in the prediction market</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-sm border border-gray-200 p-3">
                  <div className="font-semibold text-gray-900 mb-2">
                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold mr-2">
                      ACTIVE
                    </span>
                    Limited Market Access
                  </div>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Entries are locked (cannot join/leave)</li>
                    <li>Lineups are locked (cannot edit)</li>
                    <li>Can buy shares (but not sell)</li>
                    <li>Tournament scores update in real-time</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-sm border border-gray-200 p-3">
                  <div className="font-semibold text-gray-900 mb-2">
                    <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold mr-2">
                      LOCKED
                    </span>
                    All Positions Frozen
                  </div>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>No changes allowed to any positions</li>
                    <li>Prediction market completely closed</li>
                    <li>Awaiting final tournament results</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-sm border border-gray-200 p-3">
                  <div className="font-semibold text-gray-900 mb-2">
                    <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold mr-2">
                      SETTLED
                    </span>
                    Claims Available
                  </div>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Final results and rankings posted</li>
                    <li>Winners can claim contest prizes</li>
                    <li>Prediction market holders can claim payouts</li>
                    <li>One week to claim before contest closes</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-sm border border-gray-200 p-3">
                  <div className="font-semibold text-gray-900 mb-2">
                    <span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold mr-2">
                      CLOSED
                    </span>
                    Contest Archived
                  </div>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Contest is complete and archived</li>
                    <li>Unclaimed prizes are forfeited</li>
                    <li>Contest visible in history only</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div id="account" className="bg-white rounded-sm shadow p-6 scroll-mt-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-display">Account & Wallet</h2>

          <div className="space-y-4">
            {/* Porto Wallet */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What is Porto and how does it work?
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Porto is a user-friendly crypto wallet integrated into the Cut</li>
                <li>Sign in with email - no crypto experience needed</li>
                <li>Porto manages your wallet keys securely</li>
                <li>
                  You maintain full control and can export your wallet to other providers anytime
                </li>
                <li>
                  Visit your{" "}
                  <Link to="/account" className="text-blue-600 hover:underline">
                    Account page
                  </Link>{" "}
                  to view wallet details
                </li>
              </ul>
            </div>

            {/* CUT Token */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What is CUT?</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>CUT is the platform's token used for contest entry fees and prizes</li>
                <li>Each CUT token is backed 1:1 by USDC (a US dollar stablecoin)</li>
                <li>Your USDC deposits are held in Compound Finance to earn yield</li>
                <li>You can convert between CUT and USDC instantly at any time</li>
                <li>
                  Learn more on the{" "}
                  <Link to="/cut" className="text-blue-600 hover:underline">
                    CUT info page
                  </Link>
                </li>
              </ul>
            </div>

            {/* USDC */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What is USDC?</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>USDC is a stablecoin pegged 1:1 to the US Dollar</li>

                <li>You need USDC to buy CUT tokens on the Cut</li>
                <li>
                  See how to get USDC on the{" "}
                  <Link to="/usdc" className="text-blue-600 hover:underline">
                    USDC info page
                  </Link>
                </li>
              </ul>
            </div>

            {/* Buying/Selling CUT */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do I buy and sell CUT?
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>
                  Go to your{" "}
                  <Link to="/account" className="text-blue-600 hover:underline">
                    Account page
                  </Link>{" "}
                  or the{" "}
                  <Link to="/cut" className="text-blue-600 hover:underline">
                    CUT page
                  </Link>
                </li>
                <li>Use the "Buy" tab to convert USDC to CUT</li>
                <li>Use the "Sell" tab to convert CUT back to USDC</li>
                <li>Conversions happen instantly at a 1:1 ratio</li>
                <li>Small gas fees (transaction fees) apply for blockchain transactions</li>
              </ul>
            </div>

            {/* Getting USDC */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I get USDC?</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Buy USDC on crypto exchanges like Coinbase, Kraken, or Binance</li>
                <li>Purchase directly through wallet apps like MetaMask</li>
                <li>Bridge USDC from other blockchains to Base network</li>
                <li>Make sure you're using USDC on the Base network</li>
                <li>
                  See detailed instructions on the{" "}
                  <Link to="/usdc" className="text-blue-600 hover:underline">
                    USDC info page
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contracts Section */}
        <div id="contracts" className="bg-white rounded-sm shadow p-6 scroll-mt-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-display">Smart Contracts</h2>

          <div className="space-y-4">
            {/* What are Smart Contracts */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What are smart contracts?
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>
                  Smart contracts are self-executing programs on the blockchain that automatically
                  enforce agreements
                </li>
                <li>They handle all financial transactions transparently and securely</li>
                <li>No central authority can manipulate funds or results</li>
                <li>All contract code is publicly verifiable on the blockchain</li>
                <li>the Cut operates on the Base network (Ethereum Layer 2)</li>
              </ul>
            </div>

            {/* CUT Token Contract */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How does the CUT token contract work?
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>The Platform Token contract manages CUT token minting and burning</li>
                <li>When you deposit USDC, the contract mints CUT at 1:1 ratio</li>
                <li>Your USDC is deposited into Compound Finance to earn yield</li>
                <li>When you sell CUT, the contract burns your tokens and returns USDC</li>
                <li>The contract ensures CUT is always fully backed by USDC reserves</li>
              </ul>
            </div>

            {/* Escrow System */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How does the escrow system work?
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Each contest creates a unique escrow smart contract</li>
                <li>Entry fees are locked in escrow until the contest concludes</li>
                <li>No one (including the platform) can access escrowed funds early</li>
                <li>After the tournament, winners are determined automatically</li>
                <li>The escrow contract distributes prizes directly to winners' wallets</li>
              </ul>
            </div>

            {/* Fund Security */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How are my funds kept secure?
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>All funds are held in smart contracts, not by the platform</li>
                <li>Contest prizes are locked in escrow contracts with pre-defined rules</li>
                <li>Smart contracts are immutable - no one can change the rules mid-contest</li>
                <li>All transactions are recorded permanently on the blockchain</li>
                <li>You can verify all contract addresses and transactions publicly</li>
              </ul>
            </div>

            {/* Contract Addresses */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Where can I see the contract addresses?
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>
                  Visit the{" "}
                  <Link to="/contracts" className="text-blue-600 hover:underline">
                    Contracts page
                  </Link>{" "}
                  for all contract addresses
                </li>
                <li>View contracts on BaseScan (Base network block explorer)</li>
                <li>Verify contract code and transactions independently</li>
                <li>All contracts are deployed on Base Mainnet and Base Sepolia testnet</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 font-display">Need More Help?</h2>
          <p className="text-gray-700 mb-2">
            Still have questions? Here are some helpful resources:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li>
              <Link to="/terms" className="text-blue-600 hover:underline font-medium">
                Terms of Service & Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/contracts" className="text-blue-600 hover:underline font-medium">
                View Smart Contract Addresses
              </Link>
            </li>
            <li>
              <Link to="/cut" className="text-blue-600 hover:underline font-medium">
                Learn More About CUT Token
              </Link>
            </li>
            <li>
              <Link to="/usdc" className="text-blue-600 hover:underline font-medium">
                How to Get USDC
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
