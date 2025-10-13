import React from "react";
import { Link } from "react-router-dom";

import InfoScorecard from "../components/common/InfoScorecard";

export const Home: React.FC = () => {
  // const { openInstructions } = useAuth();

  return (
    <div className="flex-1 w-full flex flex-col items-center  bg-gray-50 pt-10 pb-10">
      <div className="flex items-center gap-3 mb-3" style={{ marginLeft: "-20px" }}>
        <img src="/logo-transparent.png" alt="Cut Logo" className="h-20" />

        <h1 className="text-6xl font-bold text-black">
          the Cut
          {/* <small className="text-sm text-gray-500 block">Fantasy Golf</small> */}
          <div className="text-2xl font-bold text-gray-400">Fantasy Golf</div>
        </h1>
      </div>

      {/* Features */}
      <div className="mt-1 mb-6 max-w-84 font-display max-w-sm">
        <h3
          className="text-xl font-medium italic text-green-600 text-center mb-3"
          style={{ fontFamily: "serif" }}
        >
          ~ as always ~
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4">
          <span className="hover:text-emerald-600 transition-colors">Live Updates</span>
          <span className="text-gray-500">•</span>
          <span className="hover:text-emerald-600 transition-colors">Stableford Scoring</span>
        </div>

        <h3
          className="text-xl font-medium italic text-green-600 text-center mt-6 mb-3"
          style={{ fontFamily: "serif" }}
        >
          ~ and now featuring ~
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4">
          <span className="hover:text-emerald-600 transition-colors">Crypto Payments</span>
          <span className="text-gray-500">•</span>
          <span className="hover:text-emerald-600 transition-colors">Passkey Wallets</span>
          <span className="text-gray-500">•</span>
          <span className="hover:text-emerald-600 transition-colors">SIWE</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4 mt-3">
          <span className="hover:text-emerald-600 transition-colors">Gasless Transactions</span>
          <span className="text-gray-500">•</span>
          <span className="hover:text-emerald-600 transition-colors">Bundled Transactions</span>
        </div>
        <h3
          className="text-xl font-medium italic text-green-600 text-center mt-6 mb-3"
          style={{ fontFamily: "serif" }}
        >
          ~ with special thanks to ~
        </h3>

        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4">
          <span className="hover:text-emerald-600 transition-colors">USDC Payments</span>
          <span className="text-gray-500">•</span>
          <span className="hover:text-emerald-600 transition-colors">Compound Yield</span>
        </div>
      </div>

      <hr className="w-full border-gray-200 my-8" />
      {/* Instructions */}

      {/* How to play */}
      <div>
        <h2 className="text-4xl font-bold text-gray-400 mb-6">how to play</h2>
      </div>

      <div className="flex flex-col items-center text-center gap-8 mt-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">create lineups</h3>
          <p className="text-gray-700 max-w-xs">
            Create a lineup of any four golfers from the field each week
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">enter contests</h3>
          <p className="text-gray-700 max-w-xs">
            Enter your lineups into contests to compete for prizes
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">score points</h3>
          <p className="text-gray-700 max-w-xs">Points are awarded using stableford scoring:</p>
          <div className="mt-4 max-w-xs relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background:
                  "linear-gradient(to right, #f9fafb 0%, transparent 2%, transparent 98%, #f9fafb 100%)",
              }}
            />
            <InfoScorecard />
          </div>
        </div>

        {/* 
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">throw it in the group chat</h3>
          <p className="text-gray-700 max-w-xs">
            <span className="text-lg font-display font-bold">the Cut</span> gives you the
            ingredients—now let the boys cook. Fresh action every week to keep the conversation
            popping.
          </p>
        </div> */}
      </div>

      <hr className="w-full border-gray-200 mt-12 mb-8" />

      {/* How to play */}
      <div>
        <h2 className="text-4xl font-bold text-gray-400 mb-6">get started</h2>
      </div>

      <div className="flex flex-row items-center justify-center gap-12 mt-4">
        <div className="flex flex-col items-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">join a contest</h3>
          <Link
            to="/contests"
            className="inline-flex items-center px-4 py-2 text-base font-medium text-white shadow-md transition bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 font-display"
          >
            View Contests
          </Link>
        </div>
      </div>
    </div>
  );
};
