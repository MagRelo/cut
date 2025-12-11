import React from "react";
import { Share } from "../components/common/Share";
import { ContestStatusProgressBar } from "../components/contest/ContestStatusProgressBar";
import { InfoScorecard } from "../components/common/InfoScorecard";
import { TournamentInfoPanel } from "../components/tournament/TournamentInfoPanel";

export const Home: React.FC = () => {
  return (
    <div className="flex-1 w-full flex flex-col items-center  bg-gray-50 pt-8 pb-8">
      {/* Logo */}
      <div className="flex items-center gap-3 pb-2 mb-2" style={{ marginLeft: "-20px" }}>
        <img src="/logo-transparent.png" alt="Cut Logo" className="h-20" />

        <h1 className="text-6xl font-bold text-black">
          the Cut
          <div className="text-2xl font-bold text-gray-400">Fantasy Golf</div>
        </h1>
      </div>

      {/* Features */}
      <div className="mt-2 mb-6 max-w-84 font-display max-w-sm">
        {/* featuring */}
        <h3
          className="text-xl font-medium italic text-green-600 text-center mb-3"
          style={{ fontFamily: "serif" }}
        >
          ~ featuring ~
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4">
          <span>Weekly Contests</span>
          <span className="text-gray-500">•</span>
          <span>Live Updates</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4 mt-3">
          <span>Stableford Scoring</span>
        </div>

        {/* with sensible crypto */}
        {/* <h3
          className="text-xl font-medium italic text-green-600 text-center mt-6 mb-3"
          style={{ fontFamily: "serif" }}
        >
          ~ sensible crypto ~
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4">
          <span>Passkey Wallets</span>

          <span className="text-gray-500">•</span>
          <span>Stablecoin Payments</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4 mt-3">
          <span>Sponsored Transactions</span>
          <span className="text-gray-500">•</span>
          <span>Bundled Transactions</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4 mt-3">
          <span>Automated DeFi Yield</span>
        </div> */}

        {/* special thanks to */}
        {/* <h3
          className="text-xl font-medium italic text-green-600 text-center mt-6 mb-3"
          style={{ fontFamily: "serif" }}
        >
          ~ with special thanks to ~
        </h3>

        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4">
          <span>Porto (Wallet)</span>
          <span className="text-gray-500">•</span>
          <span>USDC (Payments)</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4 mt-3">
          <span>Compound (Yield)</span>
        </div> */}
      </div>

      <hr className="w-full border-gray-200 mb-6" />

      {/* Create lineups */}
      <div className="w-full max-w-4xl px-4 mb-6">
        <div className="bg-white rounded-sm shadow p-4">
          <h3 className="text-lg font-medium text-gray-700 mb-2 font-display">
            Select four golfers
          </h3>
        </div>
      </div>

      <div className="w-full max-w-4xl px-4 mb-6">
        <div className="bg-white rounded-sm shadow p-4">
          <h3 className="text-lg font-medium text-gray-700 mb-2 font-display">
            Earn points on performance
          </h3>
          <InfoScorecard />
        </div>
      </div>

      {/* Tournament Info */}
      <div className="w-full max-w-4xl px-4 mb-6">
        <div className="bg-white rounded-sm shadow p-4">
          <h3 className="text-lg font-medium text-gray-700 mb-2 font-display mb-4">
            New Contests Every Week
          </h3>

          <div className="mb-6">
            <p className="text-xs font-display  text-gray-400 mb-1">This Week:</p>
            <TournamentInfoPanel />
          </div>

          <div className="mb-4">
            <ContestStatusProgressBar />
          </div>
        </div>
      </div>

      <hr className="w-full border-gray-200 mb-6" />

      {/* Share component */}
      <Share
        url="https://thecut.gg"
        title="the Cut Fantasy Golf"
        subtitle="Play the Cut Fantasy Golf"
      />
    </div>
  );
};
