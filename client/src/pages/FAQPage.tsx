import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { PageSection } from "../components/layout/PageSection";

export const FAQPage: React.FC = () => {
  const location = useLocation();

  // React Router client navigations do not scroll to hash targets like a full page load.
  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;

    const run = () => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // Defer until the FAQ route has painted so the target element exists.
    const handle = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [location.pathname, location.hash]);

  return (
    <>
      <PageHeader title="Frequently Asked Questions" className="mb-3" />

      {/* Quick Navigation */}
      <PageSection>
        <h3 className="mb-2 font-display text-sm font-semibold text-gray-700">Jump to Section</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <a href="#contest-gameplay" className="text-blue-600 hover:underline">
              Contest Gameplay
            </a>
          </li>
          <li>
            <a href="#winner-pool" className="text-blue-600 hover:underline">
              Winner Pool
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
          <li>
            <a href="#referral-network" className="text-blue-600 hover:underline">
              Invite Network
            </a>
          </li>
        </ul>
      </PageSection>

      <PageSection id="contest-gameplay" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">Contest Gameplay</h2>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">How does scoring work?</h3>
            <p className="mb-2 text-gray-700">
              Play The Cut uses a Modified Stableford scoring system where players earn points based on
              their performance on each hole:
            </p>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>Hole-in-one: +10 points</li>
              <li>Double Eagle or better: +15 points</li>
              <li>Eagle: +5 points</li>
              <li>Birdie: +2 points</li>
              <li>Par: 0 points</li>
              <li>Bogey: -1 point</li>
              <li>Double bogey or worse: -3 points</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Are there bonus points?</h3>
            <p className="mb-2 text-gray-700">Yes. Players can earn bonus points:</p>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>Making the cut: +3 points</li>
              <li>1st place finish: +10 points</li>
              <li>2nd place finish: +5 points</li>
              <li>3rd place finish: +3 points</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">How do I build a lineup?</h3>
            <p className="mb-2 text-gray-700">
              A lineup is four player slots plus a tie-breaker guess for the tournament week. You
              can enter the same lineup into multiple contests. While the tournament is open for
              editing, go to{" "}
              <Link to="/contests" className="text-blue-600 hover:underline">
                Live Contests
              </Link>{" "}
              and open a contest to create or edit lineups:
            </p>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>
                Tap <span className="font-medium">Build Lineup</span> or{" "}
                <span className="font-medium">Add Lineup</span> to create a new lineup
              </li>
              <li>
                On the <span className="font-medium">Players</span> tab, fill the four slots
                (changes save automatically)
              </li>
              <li>
                Set the <span className="font-medium">Tie-Breaker</span> at the bottom of the
                Players tab—your guess at how many Stableford points the winning lineup will score
                in a contest (1–250). This is not PGA stroke count or course par.
              </li>
              <li>
                When the tournament starts, lineups lock—you can no longer change slots or your
                tie-breaker
              </li>
              <li>
                Enter a lineup into one or more contests from its{" "}
                <span className="font-medium">Contests</span> tab or from the Contests page
              </li>
            </ul>
            <p className="mt-2 text-gray-700">
              New lineups get a random tie-breaker in the 125–175 range if you do not move the
              slider. You can build multiple lineups per tournament; each is its own four slots and
              tie-breaker.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Can I use the same golfers on two lineups?
            </h3>
            <p className="mb-2 text-gray-700">
              Yes, if the tie-breaker values differ. Golfer order in your four slots does not
              matter—only the set of four players and the tie-breaker define a lineup. You cannot
              save a second lineup with the same four golfers and the same tie-breaker as a lineup
              you already have.
            </p>
            <p className="mb-2 text-gray-700">
              In a contest, each lineup can only be entered once. You may enter another lineup with
              the same four golfers only if its tie-breaker differs from your other entry in that
              contest.
            </p>
            <p className="text-gray-700">
              When fantasy scores tie, ranking uses your tie-breaker first, then which lineup was
              entered into the contest earlier.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">How do contests work?</h3>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>
                Each contest is tied to one PGA Tour tournament and has its own entry fee (paid in
                xUSDC)
              </li>
              <li>Entry fees fund the contest prize pool paid to top finishers</li>
              <li>
                You join with a lineup; your fantasy score is the sum of those four golfers&apos;
                Stableford points
              </li>
              <li>Lineups lock when the tournament begins; you cannot join or leave after that</li>
              <li>
                Optional Winner Pool wagers on which lineup wins are separate—see{" "}
                <a href="#winner-pool" className="text-blue-600 hover:underline">
                  Winner Pool
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">How are lineups ranked?</h3>
            <p className="mb-2 text-gray-700">
              Every entry receives a single position (1st, 2nd, 3rd, and so on). There are no shared
              ranks and prize money is not pooled when fantasy scores match.
            </p>
            <p className="mb-2 text-gray-700">Standings use this order:</p>
            <ol className="list-decimal space-y-1 pl-6 text-gray-700">
              <li>
                <span className="font-medium">Fantasy score</span> — higher total Stableford points
                from your four golfers wins
              </li>
              <li>
                <span className="font-medium">Tie-Breaker</span> — if scores tie, the entry whose
                tie-breaker guess is closest to that contest&apos;s actual winning lineup score
                ranks higher (the highest fantasy score among all entries in that contest)
              </li>
              <li>
                <span className="font-medium">Entry time</span> — if still tied, the lineup entered
                into the contest earlier ranks higher
              </li>
            </ol>
            <p className="mt-2 text-gray-700">
              Leaderboards refresh about every 5 minutes during active tournaments. Final
              settlement uses the same ranking rules.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              What is the payout structure?
            </h3>
            <p className="mb-2 text-gray-700">
              After ranking, each paid position receives one payout—no splitting a place between
              tied scores. The split depends on how many entries are in the contest:
            </p>
            <div className="space-y-3">
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 font-semibold text-gray-900">
                  Large contests (10 or more entries):
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>1st place: 70%</li>
                  <li>2nd place: 20%</li>
                  <li>3rd place: 10%</li>
                </ul>
              </div>
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 font-semibold text-gray-900">
                  Small contests (fewer than 10 entries):
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>1st place: 100%</li>
                </ul>
              </div>
            </div>
            <p className="mt-2 text-gray-700">
              Payout percentages apply to the contest pool after the invite-network allocation (see
              fees below).
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Are there any fees?</h3>
            <p className="mb-2 text-gray-700">
              Play The Cut does not take platform fees. A portion of each pot (typically 7%) goes to the
              invite network to grow the game and reward the community. Learn more about the invite
              network{" "}
              <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
                here
              </Link>
              .
            </p>
          </div>
        </div>
      </PageSection>

      {/* Winner Pool Section */}
      <PageSection id="winner-pool" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">Winner Pool</h2>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">What is the Winner Pool?</h3>

            <p className="mb-2 text-gray-700">
              The Winner Pool is a live, parimutuel side market where you can bet on which lineup
              will win the contest.
            </p>

            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>You choose a lineup and place a wager.</li>
              <li>
                Odds are displayed as projected English odds and update as new money enters the
                pool.
              </li>
              <li>
                At settlement, only wagers on the winning lineup are paid out (winner-take-all).
              </li>
              <li>
                Your payout is proportional to your holdings on the winning lineup versus all
                winning holdings.
              </li>
            </ul>

            <p className="mt-2 text-gray-700">
              The market runs alongside the tournament, with lines staying open as rounds unfold so
              you can react in real time. You don’t need to be entered in the contest to
              participate—anyone with available funds can join the Winner Pool and place a wager on
              a lineup.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              When can I place or adjust Winner Pool wagers?
            </h3>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>
                <span className="font-semibold">OPEN:</span> Winner Pool is closed. Enter or leave
                the contest and build lineups.
              </li>
              <li>
                <span className="font-semibold">ACTIVE:</span> Place Winner Pool wagers. You cannot
                withdraw them once placed.
              </li>
              <li>
                <span className="font-semibold">LOCKED:</span> No wager changes allowed; waiting for
                final results.
              </li>
            </ul>
            <p className="mt-2 text-gray-700">
              <span className="font-semibold">Note:</span> Winner Pool betting does not lock on a
              fixed day or round. The operator may lock the market at any time, based on the
              tournament and pool activity. Settlement requires the contest to be LOCKED.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              How does the Winner Pool work?
            </h3>

            <p className="mb-2 text-gray-700">
              The Winner Pool is an <span className="font-semibold">advanced parimutuel</span>{" "}
              market: the same pooled, outcome-settled idea as a classic tote, but with{" "}
              <span className="font-semibold">algorithmic pricing</span> instead of a single static
              line.{" "}
              <span className="font-semibold">Wagers are priced using a quadratic curve.</span> Each
              incremental slice of exposure on a lineup costs more as more money stacks on that
              lineup.
            </p>

            <p className="mb-2 text-gray-700">
              The Winner Pool's dynamic pricing model provides several important upgrades to the
              traditional parimutuel market:
            </p>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>
                <span className="font-semibold">Early bettor advantage:</span> early bettors get
                better prices than late bettors.
              </li>
              <li>
                <span className="font-semibold">Whale protection:</span> large buys move price
                materially, so late large positions get worse terms than early smaller ones.
              </li>
              <li>
                <span className="font-semibold">Per-lineup market:</span> each lineup has its own
                demand/price path; activity on one lineup does not directly set the quote of
                another.
              </li>
              <li>
                <span className="font-semibold">Live odds:</span> English odds shown in the UI are a
                readability layer derived from projected return, while pricing itself follows a
                quadratic bonding curve.
              </li>
            </ul>
            <p className="mt-3 text-gray-700">
              For the full simulation write-up and scenario tables, see{" "}
              <a
                href="https://github.com/MagRelo/contestCatalyst/blob/main/SecondaryPricingSimulation.md"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Secondary Market Pricing Guide
              </a>
              .
            </p>
          </div>
        </div>
      </PageSection>

      {/* Contest Status & Timeline Section */}
      <PageSection id="contest-status" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">
          Contest Status & Timeline
        </h2>

        <div className="space-y-4">
          {/* Status Lifecycle */}
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              What are the contest status stages?
            </h3>
            <p className="mb-3 text-gray-700">Contests progress through the following lifecycle:</p>
            <div className="mb-3 rounded-sm border border-gray-200 bg-gray-50 p-4">
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
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
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
                      <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        OPEN
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                      Contest becomes available. Users can join/leave and build lineups. Winner Pool
                      opens after activation.
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
                      <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        ACTIVE
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                      Entries locked (no join/leave). Prediction market stays open (buy only).
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                      Varies
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                      Admin locks contest
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className="inline-block rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                        LOCKED
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                      An administrator manually moves the contest to LOCKED based on contest
                      conditions (for example as the event nears a conclusion). All positions
                      frozen; Winner Pool closed; awaiting final results.
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
                      <span className="inline-block rounded bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
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
                      <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                        CLOSED
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                      Contest archived after expiry. Unclaimed SETTLED payouts or un-refunded
                      CANCELLED deposits may be swept. Close is only allowed from SETTLED or
                      CANCELLED.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Details */}
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              What can I do at each status?
            </h3>
            <div className="space-y-3">
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 font-semibold text-gray-900">
                  <span className="mr-2 inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                    OPEN
                  </span>
                  Full Access
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>Join or leave the contest</li>
                  <li>Create and edit lineups</li>
                  <li>Place wagers in the prediction market</li>
                  <li>Adjust positions in the prediction market</li>
                </ul>
              </div>

              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 font-semibold text-gray-900">
                  <span className="mr-2 inline-block rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                    ACTIVE
                  </span>
                  Limited Market Access
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>Entries are locked (cannot join/leave)</li>
                  <li>Lineups are locked (cannot edit)</li>
                  <li>Can place wagers (but cannot reduce exposure)</li>
                  <li>Tournament scores update in real-time</li>
                </ul>
              </div>

              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 font-semibold text-gray-900">
                  <span className="mr-2 inline-block rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                    LOCKED
                  </span>
                  All Wagers Frozen
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>Reached only when an admin locks the contest—not on a fixed clock</li>
                  <li>No changes allowed to any positions</li>
                  <li>Prediction market completely closed</li>
                  <li>Awaiting final tournament results</li>
                </ul>
              </div>

              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 font-semibold text-gray-900">
                  <span className="mr-2 inline-block rounded bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                    SETTLED
                  </span>
                  Claims Available
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>Final results and rankings posted</li>
                  <li>Winners can claim contest prizes</li>
                  <li>Prediction market holders can claim payouts</li>
                  <li>One week to claim before contest closes</li>
                </ul>
              </div>

              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 font-semibold text-gray-900">
                  <span className="mr-2 inline-block rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                    CLOSED
                  </span>
                  Contest Archived
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>Contest is complete and archived</li>
                  <li>Unclaimed prizes are forfeited</li>
                  <li>Contest visible in history only</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      {/* Account Section */}
      <PageSection id="account" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">Account & Wallet</h2>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Do I have a Play The Cut account?
            </h3>
            <p className="mb-2 text-gray-700">
              You sign in with your email address—that&apos;s your identity on Play The Cut. Your
              balance, contest history, and wallet are tied to that email, so signing in with the
              same address on any device brings everything back.
            </p>
            <p className="mb-2 text-gray-700">
              When you sign in, we create a smart wallet for you to hold xUSDC and handle on-chain
              actions like contest entries, sends, and claims. Your funds stay in your wallet, not a
              platform-operated account, and nothing moves without your approval.
            </p>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>
                View your wallet address on{" "}
                <Link to="/account" className="text-blue-600 hover:underline">
                  Account
                </Link>
              </li>
              <li>
                Deposit or send xUSDC from{" "}
                <Link to="/account/funds" className="text-blue-600 hover:underline">
                  Account → Manage funds
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">What is xUSDC?</h3>
            <p className="mb-2 text-gray-700">
              <span className="font-medium">xUSDC is a testing-only token.</span> It is used on Base
              Sepolia to simulate contest entry fees, prizes, and transfers. It is{" "}
              <span className="font-medium">not real money</span> and has no cash value—you cannot
              buy goods with it or redeem it for USD.
            </p>
            <p className="mb-2 text-gray-700">
              The name and decimals mirror USDC so flows feel realistic during development and
              testing, but xUSDC is separate from Circle USDC on mainnet.
            </p>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>Used for contest entry fees, payouts, and peer transfers in the app</li>
              <li>6 decimals; treated as $1 per token only for display and test math on testnet</li>
              <li>
                Get or move xUSDC from{" "}
                <Link to="/account/funds" className="text-blue-600 hover:underline">
                  Account → Manage funds
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </PageSection>

      {/* Contracts Section */}
      <PageSection id="contracts" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">Smart Contracts</h2>
        <p className="mb-4 text-gray-700">
          Looking for deployed addresses and network details? Visit the{" "}
          <Link to="/contracts" className="text-blue-600 hover:underline">
            Contracts page
          </Link>
          .
        </p>

        <div className="space-y-4">
          {/* What are Smart Contracts */}
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">What are smart contracts?</h3>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>
                Smart contracts are self-executing programs on the blockchain that automatically
                enforce agreements
              </li>
              <li>They handle all financial transactions transparently and securely</li>
              <li>No central authority can manipulate funds or results</li>
              <li>All contract code is publicly verifiable on the blockchain</li>
            </ul>
          </div>

          {/* Fund Security */}
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              How are my funds kept secure?
            </h3>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>All funds are held in smart contracts, not by the platform</li>
              <li>Contest prizes are locked in escrow contracts with pre-defined rules</li>
              <li>Smart contracts are immutable - no one can change the rules mid-contest</li>
              <li>All transactions are recorded permanently on the blockchain</li>
              <li>You can verify all contract addresses and transactions publicly</li>
            </ul>
          </div>

          {/* Contest contract */}
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              How does the Contest contract hold and pay prizes?
            </h3>
            <p className="mb-2 text-gray-700">
              Each contest on Play The Cut has its own on-chain{" "}
              <span className="font-medium">Contest</span> smart contract. Entry fees, the primary
              prize pool, and Winner Pool funds all live in that contract—not in a platform wallet.
            </p>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>
                When you enter, your fee is deposited into that contest&apos;s Contest contract
              </li>
              <li>Funds stay locked in the Contest contract until the contest settles</li>
              <li>No one, including the platform, can withdraw them early</li>
              <li>After the tournament, the Contest contract settles from final standings</li>
              <li>Winners claim payouts directly from the Contest contract to their wallets</li>
            </ul>
          </div>

          {/* Contract Addresses */}
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Where can I see the contract addresses?
            </h3>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>
                Visit the{" "}
                <Link to="/contracts" className="text-blue-600 hover:underline">
                  Contracts page
                </Link>{" "}
                for all contract addresses
              </li>
              <li>View contracts on BaseScan (Base network block explorer)</li>
              <li>Verify contract code and transactions independently</li>
              <li>Deployed contracts are listed for Base Sepolia testnet</li>
            </ul>
          </div>
        </div>
      </PageSection>

      {/* Referral Network Section */}
      <PageSection id="referral-network" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">Invite Network</h2>

        <div className="space-y-4 text-gray-700">
          <p>
            Play The Cut&apos;s invite network runs on{" "}
            <a
              href="https://referraltree.mattlovan.dev/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              referralTree
            </a>
            —on-chain infrastructure built to fund communities and projects through referral
            rewards.
          </p>
          <figure className="space-y-3 rounded-sm border border-l-4 border-emerald-200/80 border-l-emerald-600 bg-emerald-50/50 p-4 sm:p-5">
            <figcaption className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900">
              From{" "}
              <a
                href="https://referraltree.mattlovan.dev/"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-800 underline-offset-2 hover:underline"
              >
                referralTree
              </a>
            </figcaption>
            <blockquote className="space-y-3 border-0 p-0 not-italic text-gray-700">
              <p>
                An invite network is built like a family tree. When you invite someone, they become
                part of your first level. If that person invites someone else, that new person is on
                the 2nd level, and so on. This creates a multi-level graph of relationships{" "}
                <strong>up to 10 levels deep</strong>.
              </p>
              <p>
                When it comes time to distribute rewards the process runs in reverse—a portion of
                the reward is distributed to the original referrer, a portion is distributed to the
                referrer&apos;s referrers, and so on up the chain.
              </p>
              <p>
                The more people you invite—and the more they invite—the faster your network can
                grow. Over time it can reach hundreds of people, all connected back to you through
                the referral chain.
              </p>
            </blockquote>
          </figure>
          <p>Here&apos;s how it works on Play The Cut:</p>
          <p>
            When someone creates a contest, they set the invite-network percentage for that
            contest—how much of the total prize pool is reserved for referral rewards. That setting
            is locked in on-chain when the contest is created (you can see the allocation on each
            contest&apos;s payout breakdown).
          </p>
          <p>
            Rewards are paid out when the contest settles and a winner is crowned. At settlement,
            the invite rewards are distributed up the winner&apos;s invite chain: the person who
            invited them, their inviter, and so on—using the multi-level rules above.
          </p>
        </div>
      </PageSection>

      <aside
        aria-labelledby="faq-more-help"
        className="mt-6 rounded-sm border border-blue-200 bg-blue-50 p-4 sm:p-5"
      >
        <h2 id="faq-more-help" className="mb-1 font-display text-lg font-bold text-gray-900">
          Need more help?
        </h2>
        <p className="mb-3 text-sm text-gray-700">Still have questions? Try these pages:</p>
        <nav className="flex flex-col gap-2 font-display text-sm" aria-label="FAQ resources">
          <Link to="/guides/start-a-league" className="font-medium text-blue-600 hover:underline">
            Start a league guide
          </Link>
          <Link to="/terms" className="font-medium text-blue-600 hover:underline">
            Terms of Service
          </Link>
          <Link to="/privacy" className="font-medium text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/responsible-gaming" className="font-medium text-blue-600 hover:underline">
            Responsible Participation
          </Link>
          <Link to="/disclosures" className="font-medium text-blue-600 hover:underline">
            Disclosures and Risk Statement
          </Link>
          <Link to="/contracts" className="font-medium text-blue-600 hover:underline">
            Smart contract addresses
          </Link>
        </nav>
      </aside>
    </>
  );
};
