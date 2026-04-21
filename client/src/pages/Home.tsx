import React from "react";
import { Share } from "../components/common/Share";
import { InfoScorecard } from "../components/common/InfoScorecard";
import { HARDCODED_PLAYERS } from "../lib/marketingDummies";

export const Home: React.FC = () => {
  return (
    <div className="flex-1 w-full min-w-0 flex flex-col items-center bg-gray-50 pt-8 pb-8 px-1 sm:px-0">
      <div className="w-full min-w-0 max-w-full">
        {/* Title and Logo — stack on narrow viewports so copy doesn’t collide with the logo */}
        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-5 pb-2">
          <img
            src="/logo-transparent.png"
            alt="Cut Logo"
            className="h-24 sm:h-32 w-auto flex-shrink-0"
          />

          <h1 className="text-center sm:text-left text-4xl sm:text-5xl md:text-6xl font-bold text-black">
            the Cut
            <div className="text-xl sm:text-2xl font-bold text-gray-400">Fantasy Golf + </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-400">Prediction Market</div>
          </h1>
        </div>
        {/* Features — stay centered at all breakpoints (sm:mx-0 had pulled this block left) */}
        <div className="w-full max-w-sm mx-auto font-display mt-2 mb-4">
          <h3
            className="text-lg sm:text-xl font-medium italic text-green-600 text-center mb-3"
            style={{ fontFamily: "serif" }}
          >
            ~ featuring ~
          </h3>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-gray-800 text-sm font-medium px-1 mb-3">
            <span>Weekly Contests</span>
            <span className="text-gray-500">•</span>
            <span>Live Scoring Updates</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-gray-800 text-sm font-medium px-1">
            <span>Prediction Market</span>
            <span className="text-gray-500">•</span>
            <span>Zero Fees</span>
          </div>
        </div>
      </div>

      <hr className="w-full border-gray-200 my-8" />

      {/* How To Win */}
      <div className="w-full max-w-4xl px-4">
        <h3 className="text-2xl font-bold text-gray-400 mb-6 text-center">How To Win</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Way 1: Enter Contests */}
          <div className="bg-white rounded-sm shadow p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg  font-display">
                1
              </div>
              <h4 className="text-xl font-bold text-gray-900">Enter Contests</h4>
            </div>
            <p className="text-gray-700 leading-relaxed font-display ml-4">
              Build your fantasy lineup and compete for the top prize. Score points based on your
              golfers' performance - winner take all.
            </p>
          </div>

          {/* Way 2: Predict Winners */}
          <div className="bg-white rounded-sm shadow p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg font-display">
                2
              </div>
              <h4 className="text-xl font-bold text-gray-900">Predict Contest Winners</h4>
            </div>
            <p className="text-gray-700 leading-relaxed font-display ml-4">
              Buy shares in any team. Shares are priced based on demand - buy early to secure a
              better price.
            </p>
          </div>

          {/* Way 3: Referrals  */}
          {/* <div className="bg-white rounded-sm shadow p-6 border-2 border-orange-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg font-display">
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

      <hr className="w-full border-gray-200 my-8" />

      {/* How To Play Contests */}
      <div className="w-full max-w-4xl px-4">
        <h3 className="text-2xl font-bold text-gray-400 mb-4 text-center">How To Play Contests</h3>
        <div className="bg-white rounded-sm shadow p-4 mb-4">
          <h3 className="text-lg font-medium text-gray-700 mb-4 font-display">
            1. Select four golfers from the field:
          </h3>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {HARDCODED_PLAYERS.map((player, i) => (
              <div key={i} className="flex flex-col items-center">
                {/* Profile Picture */}
                {player.pga_imageUrl && (
                  <div className="flex-shrink-0 mb-2">
                    <img
                      className="h-10 w-10 rounded-full object-cover border border-gray-300"
                      src={player.pga_imageUrl}
                      alt={player.name}
                      style={{ objectPosition: "center top" }}
                    />
                  </div>
                )}
                {/* Player Name */}
                <div className="text-sm font-semibold text-gray-900 text-center">{player.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-sm shadow p-4 mb-4">
          <h3 className="text-lg font-medium text-gray-700 mb-4 font-display">
            2. Score points based on golfer performance:
          </h3>
          <InfoScorecard />
        </div>

        <div className="bg-white rounded-sm shadow p-4 mb-4">
          <h3 className="text-lg font-medium text-gray-700 mb-4 font-display">
            3. Team with the highest score wins:
          </h3>

          {/* contest screenshot image */}
          <div className="border border-green-300 shadow-lg max-w-[18rem] mx-auto">
            <img src="/team-screenshot.png" alt="contest screenshot" className="w-full h-auto" />
          </div>
        </div>
      </div>

      <hr className="w-full border-gray-200 my-8" />

      {/* Referral Bonus */}
      <div className="w-full max-w-4xl px-4">
        <h3 className="text-2xl font-bold text-gray-400 mb-4 text-center">
          Referral Network Bonuses
        </h3>
        <div className="bg-white rounded-sm shadow p-6 border-2 border-orange-200 hover:shadow-lg transition-shadow">
          <p className="text-gray-700 leading-relaxed font-display text-center mb-5 max-w-2xl mx-auto">
            Earn bonuses when you refer new players—and when <em>their</em> invites bring in more
            users. Rewards can stack across multiple levels, so your network keeps paying you back.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="rounded-sm border border-orange-100 bg-orange-50/40 p-4">
              <div className="text-xs font-display font-semibold uppercase tracking-wide text-orange-700 mb-2">
                Level 1
              </div>
              <p className="text-sm text-gray-700 font-display leading-snug">
                You refer someone—when they win, you earn a bonus.
              </p>
            </div>
            <div className="rounded-sm border border-orange-100 bg-orange-50/40 p-4">
              <div className="text-xs font-display font-semibold uppercase tracking-wide text-orange-700 mb-2">
                Level 2
              </div>
              <p className="text-sm text-gray-700 font-display leading-snug">
                They refer their own friends—you can earn <i>again</i> on that activity.
              </p>
            </div>
            <div className="rounded-sm border border-orange-100 bg-orange-50/40 p-4">
              <div className="text-xs font-display font-semibold uppercase tracking-wide text-orange-700 mb-2">
                Deeper levels
              </div>
              <p className="text-sm text-gray-700 font-display leading-snug">
                The chain keeps going—bonuses apply up to <strong>10 levels</strong> deep.
              </p>
            </div>
          </div>
        </div>
      </div>

      <hr className="w-full border-gray-200 my-8" />

      {/* Share component */}
      <Share
        url="https://cut-v2.mattlovan.dev"
        title="the Cut Fantasy Golf"
        subtitle="Play the Cut Fantasy Golf"
      />
    </div>
  );
};
