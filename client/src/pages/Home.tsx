import React from "react";
import { Share } from "../components/common/Share";
import { ContestStatusProgressBar } from "../components/contest/ContestStatusProgressBar";
import { InfoScorecard } from "../components/common/InfoScorecard";
import { TournamentInfoPanel } from "../components/tournament/TournamentInfoPanel";

const HARDCODED_PLAYERS = [
  {
    name: "Carl Yuan",
    pga_imageUrl:
      "https://pga-tour-res.cloudinary.com/image/upload/c_fill,dpr_2.0,f_auto,g_center,h_350,q_auto,w_280,b_rgb:000000/e_trim:10/c_thumb,g_face,w_280,h_350,z_0.7/headshots_55454.jpg",
  },
  {
    name: "Will Zalatoris",
    pga_imageUrl:
      "https://pga-tour-res.cloudinary.com/image/upload/c_fill,dpr_2.0,f_auto,g_center,h_350,q_auto,w_280,b_rgb:000000/e_trim:10/c_thumb,g_face,w_280,h_350,z_0.7/headshots_47483.jpg",
  },
  {
    name: "Fabrizio Zanotti",
    pga_imageUrl:
      "https://pga-tour-res.cloudinary.com/image/upload/c_fill,dpr_2.0,f_auto,g_center,h_350,q_auto,w_280,b_rgb:000000/e_trim:10/c_thumb,g_face,w_280,h_350,z_0.7/headshots_29939.jpg",
  },
  {
    name: "Fuzzy Zoeller",
    pga_imageUrl:
      "https://pga-tour-res.cloudinary.com/image/upload/c_fill,dpr_2.0,f_auto,g_center,h_350,q_auto,w_280,b_rgb:000000/e_trim:10/c_thumb,g_face,w_280,h_350,z_0.7/headshots_02321.jpg",
  },
];

export const Home: React.FC = () => {
  return (
    <div className="flex-1 w-full flex flex-col items-center  bg-gray-50 pt-8 pb-8">
      {/* Logo */}
      <div className="flex items-center gap-3 pb-2" style={{ marginLeft: "-24px" }}>
        <img src="/logo-transparent.png" alt="Cut Logo" className="h-32" />

        <h1 className="text-6xl font-bold text-black">
          the Cut
          <div className="text-2xl font-bold text-gray-400">Fantasy Golf + </div>
          <div className="text-2xl font-bold text-gray-400">Prediction Market</div>
        </h1>
      </div>
      {/* Features */}
      <div className="max-w-84 font-display max-w-sm mt-2 mb-4">
        {/* featuring */}
        <h3
          className="text-xl font-medium italic text-green-600 text-center mb-3"
          style={{ fontFamily: "serif" }}
        >
          ~ featuring ~
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4 mb-3">
          <span>Real Money</span>
          <span className="text-gray-500">•</span>
          <span>Live Updates</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-800 text-sm font-medium max-w-3xl px-4">
          <span>Weekly Contests</span>
          <span className="text-gray-500">•</span>
          <span>Trackable Results</span>
        </div>
      </div>
      <hr className="w-full border-gray-200 my-8" />
      <h3 className="text-2xl font-bold text-gray-400 mb-6">How To Win</h3>
      <div className="w-full max-w-4xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Way 1: Enter Contests */}
          <div className="bg-white rounded-sm shadow p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg  font-display">
                1
              </div>
              <h4 className="text-xl font-bold text-gray-900">Enter Contests</h4>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Build your fantasy lineup and compete for the top prize. Score points based on your
              golfers' performance and climb the leaderboard!
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
            <p className="text-gray-700 leading-relaxed">
              Bet on who will win each contest. Make predictions on contest outcomes and earn
              rewards when you're right!
            </p>
          </div>
        </div>
      </div>
      <hr className="w-full border-gray-200 my-8" />
      {/* section title: Fantasy Golf */}
      <h3 className="text-2xl font-bold text-gray-400 mb-4">How To Play</h3>
      {/* Create lineups */}
      <div className="w-full max-w-4xl px-4 mb-6">
        <div className="bg-white rounded-sm shadow p-4">
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
      </div>
      <div className="w-full max-w-4xl px-4 mb-6">
        <div className="bg-white rounded-sm shadow p-4">
          <h3 className="text-lg font-medium text-gray-700 mb-4 font-display">
            2. Earn points on golfer performance:
          </h3>
          <InfoScorecard />
        </div>
      </div>
      {/* Tournament Info */}
      <div className="w-full max-w-4xl px-4 mb-6">
        <div className="bg-white rounded-sm shadow p-4">
          <h3 className="text-lg font-medium text-gray-700 mb-4 font-display">
            3. New Contests Every Week
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
