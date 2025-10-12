import React from "react";
import { Link } from "react-router-dom";

import InfoScorecard from "../components/common/InfoScorecard";

export const Home: React.FC = () => {
  // const { openInstructions } = useAuth();

  return (
    <div className="flex-1 w-full flex flex-col items-center  bg-gray-50 pt-10 pb-10">
      <div className="flex items-center gap-4">
        <img src="/logo-transparent.png" alt="Cut Logo" className="h-20" />

        <h1 className="text-6xl font-bold text-black">
          the Cut
          {/* <small className="text-sm text-gray-500 block">Fantasy Golf</small> */}
          <div className="text-2xl font-bold text-gray-400 mb-3">Fantasy Golf</div>
        </h1>
      </div>

      {/* <h4 className="text-2xl font-bold text-gray-800 mb-3">Fantasy Golf</h4> */}
      {/* <h4 className="text-2xl font-bold text-emerald-600 mb-2">(with fantasy golf)</h4> */}

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
          <h3 className="text-2xl font-bold text-gray-800 mb-4">create a lineup</h3>
          <Link
            to="/lineups"
            className="inline-flex items-center px-4 py-2 text-base font-medium text-white shadow-md transition bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
          >
            My Lineups
          </Link>
        </div>
      </div>
    </div>
  );
};
