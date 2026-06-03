import React from "react";
import { Link } from "react-router-dom";
import { Share } from "../components/common/Share";
import { InfoScorecard } from "../components/common/InfoScorecard";
import { PageSection } from "../components/layout/PageSection";
import { HARDCODED_PLAYERS } from "../lib/marketingDummies";

export const Home: React.FC = () => {
  return (
    <div className="flex w-full min-w-0 flex-1 flex-col items-center pb-8 pt-6">
      <div className="w-full min-w-0 max-w-full">
        {/* Title and Logo — horizontal at all breakpoints */}
        <div className="flex justify-center px-2 pb-2 sm:px-0">
          <div className="flex min-w-0 max-w-full flex-row items-center justify-center gap-3 sm:gap-3">
            <img
              src="/logo-transparent.png"
              alt="Cut Logo"
              className="h-24 w-auto flex-shrink-0 sm:h-32"
            />

            <h1 className="min-w-0 text-4xl font-bold text-black sm:text-5xl md:text-6xl">
              The Cut
              <div className="text-xl font-bold text-gray-400 sm:text-2xl">Fantasy Golf</div>
            </h1>
          </div>
        </div>
        {/* Features — stay centered at all breakpoints (sm:mx-0 had pulled this block left) */}
        <div className="mx-auto mb-4 mt-2 w-full max-w-sm font-display">
          <h3
            className="mb-3 text-center text-lg font-medium italic text-green-700 sm:text-xl"
            style={{ fontFamily: "serif" }}
          >
            ~ featuring ~
          </h3>

          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 text-sm font-medium text-gray-800">
            <span>Live Scoring</span>
            <span className="text-gray-500">•</span>
            <span>Weekly Contests</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 text-sm font-medium text-gray-800">
            <span>Private Leagues</span>
            <span className="text-gray-500">•</span>
            <span>No Fees</span>
          </div>
        </div>
      </div>

      <hr className="my-8 w-full border-gray-200" />

      {/* How To Win */}
      <div className="w-full max-w-4xl px-4">
        <h3 className="mb-6 text-center text-2xl font-bold text-gray-400">How To Win</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Way 1: Enter Contests */}
          <div className="rounded-sm border-2 border-emerald-500/70 p-6 transition-colors hover:border-emerald-700">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 font-display text-lg font-bold text-white">
                1
              </div>
              <h4 className="text-xl font-bold text-gray-900">Enter Contests</h4>
            </div>
            <p className="ml-4 font-display leading-relaxed text-gray-700">
              Build your fantasy lineup and compete for the top prize. Score points based on your
              golfers' performance - winner take all.
            </p>
          </div>

          {/* Way 2: Predict Winners */}
          <div className="rounded-sm border-2 border-blue-200 p-6 transition-colors hover:border-blue-300">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 font-display text-lg font-bold text-white">
                2
              </div>
              <h4 className="text-xl font-bold text-gray-900">Predict Contest Winners</h4>
            </div>
            <p className="ml-4 font-display leading-relaxed text-gray-700">
              Place a wager on any lineup and track projected English odds from live pool demand.
            </p>
          </div>

          {/* Way 3: Referrals  */}
          {/* <div className="bg-white rounded-sm shadow p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg font-display">
                3
              </div>
              <h4 className="text-xl font-bold text-gray-900">Invite Friends</h4>
            </div>
            <p className="text-gray-700 leading-relaxed font-display ml-4">
              Earn money by referring new users to the platform. Also earn money on <i>their</i>{" "}
              referrals, and the <i>referrals</i> of their referrals, and so on.
            </p>
          </div>
           */}
        </div>
      </div>

      <hr className="my-8 w-full border-gray-200" />

      {/* How To Play Contests */}
      <div className="w-full max-w-4xl px-4">
        <h3 className="mb-4 text-center text-2xl font-bold text-gray-400">How To Play Contests</h3>
        <PageSection>
          <h3 className="mb-4 font-display text-lg font-medium text-gray-700">
            1. Select four golfers from the field:
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-4">
            {HARDCODED_PLAYERS.map((player, i) => (
              <div key={i} className="flex flex-col items-center">
                {/* Profile Picture */}
                {player.pga_imageUrl && (
                  <div className="mb-2 flex-shrink-0">
                    <img
                      className="h-10 w-10 rounded-full border border-gray-300 object-cover"
                      src={player.pga_imageUrl}
                      alt={player.name}
                      style={{ objectPosition: "center top" }}
                    />
                  </div>
                )}
                {/* Player Name */}
                <div className="text-center text-sm font-semibold text-gray-900">{player.name}</div>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection>
          <h3 className="mb-4 font-display text-lg font-medium text-gray-700">
            2. Score points based on golfer performance:
          </h3>
          <InfoScorecard />
        </PageSection>

        <PageSection>
          <h3 className="mb-4 font-display text-lg font-medium text-gray-700">
            3. Team with the highest score wins:
          </h3>

          {/* contest screenshot image */}
          <div className="mx-auto max-w-[18rem] border border-green-300 shadow-lg">
            <img src="/team-screenshot.png" alt="contest screenshot" className="h-auto w-full" />
          </div>
        </PageSection>
      </div>

      <hr className="my-8 w-full border-gray-200" />

      {/* Referral Bonus */}
      <div className="w-full max-w-4xl px-4">
        <h3 className="mb-4 text-center text-2xl font-bold text-gray-400">Invite Rewards</h3>
        <div className="rounded-sm border border-l-4 border-emerald-200/80 border-l-emerald-600 bg-emerald-50/50 p-6">
          <p className="mx-auto mb-5 max-w-2xl text-center font-display leading-relaxed text-gray-700">
            The Cut&apos;s invite rewards run on{" "}
            <a
              href="https://referraltree.mattlovan.dev/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              referralTree
            </a>
            —on-chain infrastructure that builds a multi-level referral tree. When you refer new
            players—and they <em>they</em> refer new players—rewards stack across levels, so your
            network keeps paying you back.{" "}
            <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
              Learn more
            </Link>
            .
          </p>
          <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
            <div className="rounded-sm border border-emerald-500/70 bg-white p-4">
              <div className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900">
                Level 1
              </div>
              <p className="font-display text-sm leading-snug text-gray-700">
                You refer someone—when they win, you earn a bonus.
              </p>
            </div>
            <div className="rounded-sm border border-emerald-500/70 bg-white p-4">
              <div className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900">
                Level 2
              </div>
              <p className="font-display text-sm leading-snug text-gray-700">
                They refer their own friends—you can earn <i>again</i> on that activity.
              </p>
            </div>
            <div className="rounded-sm border border-emerald-500/70 bg-white p-4">
              <div className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900">
                Deeper levels...
              </div>
              <p className="font-display text-sm leading-snug text-gray-700">
                The chain keeps going and going—bonuses apply up to <strong>10 levels deep</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-8 w-full border-gray-200" />

      <div className="mb-8 flex w-full flex-col items-center gap-3 px-4">
        <h3 className="text-center text-2xl font-bold text-gray-400">Live Contests</h3>
        <p className="text-center font-display text-gray-700">New contests every week:</p>
        <Link
          to="/contests"
          className="inline-block w-full max-w-sm rounded-lg border border-blue-500 bg-blue-500 px-6 py-3 text-center font-display text-base font-semibold text-white transition-colors hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          View Contests
        </Link>
      </div>

      <hr className="my-8 w-full border-gray-200" />

      {/* Share component */}
      <Share
        url="https://playthecut.com"
        title="The Cut Fantasy Golf"
        subtitle="Play The Cut Fantasy Golf"
      />
    </div>
  );
};
