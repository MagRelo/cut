import React, { useEffect } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import { PageSection } from "../components/layout/PageSection";

export const LEAGUE_STARTER_GUIDE_PATH = "/guides/start-a-league";

export const LeagueStarterGuidePage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;

    const run = () => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handle = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [location.pathname, location.hash]);

  return (
    <>
      <h1 className="mb-3 font-display text-3xl font-bold text-gray-900">Start a League</h1>
      <p className="mb-4 text-gray-700">
        A quick guide for founding a private league—playing with friends, running contests, and
        getting everyone funded.
      </p>

      <PageSection>
        <h3 className="mb-2 font-display text-sm font-semibold text-gray-700">Jump to Section</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <a href="#why" className="text-blue-600 hover:underline">
              Why start a league?
            </a>
          </li>
          <li>
            <a href="#get-started" className="text-blue-600 hover:underline">
              Get started
            </a>
          </li>
          <li>
            <a href="#admin" className="text-blue-600 hover:underline">
              Running your league (admin)
            </a>
          </li>
          <li>
            <a href="#funding" className="text-blue-600 hover:underline">
              Funding accounts
            </a>
          </li>
        </ul>
      </PageSection>

      <PageSection id="why" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">Why start a league?</h2>

        <div className="space-y-4 text-gray-700">
          <p>
            Leagues are private groups where you and your friends compete each week. All real-money
            contests on Play The Cut happen inside leagues—you pick four golfers, score with
            Modified Stableford, and play for stakes with people you know instead of a giant public
            table.
          </p>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Play with your crew</h3>
            <p>
              A league is your home base: one place for members, weekly contests, and leaderboards.
              You control who&apos;s in, what contests run, and how big the entry fees are.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Invite Rewards</h3>
            <p className="mb-2">
              When you create a league contest, you choose an <strong>Invite Rewards</strong>{" "}
              percentage—how much of the contest pool is reserved for the invite network. The
              default is <strong>7%</strong> (you can set anywhere from 0% to 20%).
            </p>
            <p className="mb-2">
              Those rewards are paid when the contest settles and a winner is crowned. The share
              flows up the <strong>winner&apos;s</strong> invite chain—the person who invited them,
              their inviter, and so on—using a multi-level on-chain network.
            </p>
            <p>
              <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
                Learn more about the invite network
              </Link>
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection id="get-started" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">Get started</h2>

        <ol className="list-decimal space-y-4 pl-6 text-gray-700">
          <li>
            <strong>Sign in</strong> to Play The Cut (you need an account to create or join a
            league).
          </li>
          <li>
            Go to{" "}
            <Link to="/leagues" className="text-blue-600 hover:underline">
              My Leagues
            </Link>{" "}
            and tap <strong>Create League</strong>.
          </li>
          <li>
            Enter a <strong>name</strong> and optional <strong>description</strong>, then submit.
            You become the league <strong>admin</strong> automatically.
          </li>
          <li>
            On your league page, open the <strong>Manage</strong> tab and tap{" "}
            <strong>Generate invite link</strong>.
          </li>
          <li>
            <strong>Copy and share</strong> the link—text, iMessage, email, whatever works. There is
            no in-app email send; you share the link yourself.
          </li>
          <li>
            When a friend opens the link, they&apos;ll be prompted to <strong>sign in or create an
            account</strong> if they aren&apos;t already. New players are credited to you as their
            referrer, join your league, and land on the league page.
          </li>
        </ol>

        <p className="mt-4 text-sm text-gray-600">
          Creating a league does not create a contest yet—that&apos;s an admin step on the Manage
          tab (see below).
        </p>

        <div className="mt-6">
          <Link
            to="/leagues/create"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Create a league
          </Link>
        </div>
      </PageSection>

      <PageSection id="admin" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">
          Running your league (admin)
        </h2>

        <p className="mb-4 text-gray-700">
          League admins see a <strong>Manage</strong> tab on the league detail page. Everything
          below lives there.
        </p>

        <div className="space-y-4 text-gray-700">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Create a contest</h3>
            <p className="mb-2">
              League contests are scoped to your members only. When you create one, you set:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Entry fee</strong> — cost to enter a lineup in the contest
              </li>
              <li>
                <strong>Winner Pool subsidy</strong> — share of each entry fee sent to the Winner
                Pool prediction market. This jumpstarts the pool so there&apos;s more action and
                predictions are more fun from the start.
              </li>
              <li>
                <strong>Invite Rewards</strong> — share of the contest pool for the invite network
                at settlement
              </li>
            </ul>
            <p className="mt-2">
              Submitting creates an on-chain contest; your wallet will ask you to confirm the
              transaction. After that, members can build lineups and enter from the contest lobby.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Invite link</h3>
            <p className="mb-3">
              <strong>Generate</strong> a link if you don&apos;t have one yet (connect your wallet
              on the current network first). <strong>Rotate</strong> to issue a new link—the old
              one stops working immediately. Use rotation if a link was shared too widely or you
              want to stop new joins temporarily.
            </p>
            <p className="text-sm text-gray-700">
              One link does both jobs: it adds someone to <em>your league</em> and sets you as their
              referrer for invite rewards when they sign up. Share it when onboarding new players—you
              don&apos;t need a separate Account invite link for league members.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Members</h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Add member</strong> — enter a wallet address (
                <code className="text-xs">0x…</code>) if someone already has an account but missed
                the invite link. You can add them as a regular member or as a co-admin.
              </li>
              <li>
                <strong>Send funds</strong> — opens Manage funds with the member&apos;s wallet
                pre-filled so you can transfer testnet xUSDC from your connected wallet.
              </li>
              <li>
                <strong>Remove member</strong> — removes them from the league. You cannot remove the
                last admin; promote someone else first if needed.
              </li>
            </ul>
            <p className="mt-2 text-sm text-gray-600">
              Members can copy the invite link from the league header once you have generated one
              (they cannot rotate it).
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">League settings</h3>
            <p>
              Update the league <strong>name</strong> or <strong>description</strong> anytime.{" "}
              <strong>Delete league</strong> removes the league and memberships; existing contests
              are unlinked from the league but are not deleted on-chain.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Link
            to="/leagues"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Go to My Leagues
          </Link>
        </div>
      </PageSection>

      <PageSection id="funding" className="scroll-mt-4">
        <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">Funding accounts</h2>

        <div className="space-y-4 text-gray-700">
          <div
            className="overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-tl from-amber-100 via-amber-50 to-white shadow-sm"
            role="note"
          >
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/80 px-3 py-2">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                Testnet only
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm leading-relaxed text-amber-950/90">
                Play The Cut is currently on <strong>Base Sepolia testnet</strong>. Contests use
                testnet <strong>xUSDC</strong>—not real USDC. Do not send mainnet funds or real USDC
                to your wallet; deposits will not land and may be lost. We&apos;re transitioning to{" "}
                <strong>Base mainnet</strong> soon—stay tuned for updates.
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Account ID &amp; fund links</h3>
            <p>
              Your <strong>Account ID</strong> is your smart wallet address on the{" "}
              <Link to="/account" className="text-blue-600 hover:underline">
                Account
              </Link>{" "}
              page. Each player also has a <strong>Share fund link</strong> there—send that link to
              anyone who should fund their account; it opens Manage funds with their wallet
              pre-filled.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Manage funds</h3>
            <p className="mb-2">
              Open{" "}
              <Link to="/account/funds" className="text-blue-600 hover:underline">
                Account → Manage funds
              </Link>{" "}
              (sign-in required):
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Request Funds</strong> — share a link with someone who has funds so they can
                transfer to your account.
              </li>
              <li>
                <strong>Send</strong> — peer-to-peer transfer: enter a recipient&apos;s wallet
                address and amount, or use a fund link / league Manage tab <strong>Send funds</strong>{" "}
                link to pre-fill the recipient.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Tips for league founders</h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Onboard new members in order:</strong>
                <ol className="mt-2 list-decimal space-y-1 pl-6">
                  <li>
                    Send your <strong>league invite link</strong> from the Manage tab—they sign up,
                    join your league, and you become their referrer automatically.
                  </li>
                  <li>
                    Use <strong>Send funds</strong> on the Manage tab member list (or Manage funds)
                    to transfer starter xUSDC from your wallet.
                  </li>
                </ol>
              </li>
            </ul>
          </div>

          <p>
            For wallet security and what xUSDC is, see{" "}
            <Link to="/faq#account" className="text-blue-600 hover:underline">
              FAQ → Account &amp; Wallet
            </Link>
            .
          </p>
        </div>

        <div className="mt-6">
          <Link
            to="/account/funds"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Manage funds
          </Link>
        </div>
      </PageSection>

      <aside
        aria-labelledby="guide-more-help"
        className="mt-6 rounded-sm border border-blue-200 bg-blue-50 p-4 sm:p-5"
      >
        <h2 id="guide-more-help" className="mb-1 font-display text-lg font-bold text-gray-900">
          More help
        </h2>
        <p className="mb-3 text-sm text-gray-700">Gameplay, scoring, and contest rules:</p>
        <nav className="flex flex-col gap-2 font-display text-sm" aria-label="Guide resources">
          <Link to="/faq" className="font-medium text-blue-600 hover:underline">
            Frequently Asked Questions
          </Link>
          <Link to="/faq#referral-network" className="font-medium text-blue-600 hover:underline">
            Invite network deep dive
          </Link>
          <Link to="/leagues/create" className="font-medium text-blue-600 hover:underline">
            Create a league
          </Link>
        </nav>
      </aside>
    </>
  );
};
