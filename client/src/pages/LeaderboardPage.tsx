import React from "react";
import { useTournament } from "../contexts/TournamentContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/util/ErrorMessage";
import { PageHeader } from "../components/util/PageHeader";
import { PlayerWithTournamentData } from "../types/player";

export const LeaderboardPage: React.FC = () => {
  const { currentTournament, players, isLoading, error } = useTournament();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message={error.message} />
      </div>
    );
  }

  if (!currentTournament) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">No tournament data available</p>
      </div>
    );
  }

  const getPlayerDisplayName = (player: PlayerWithTournamentData) => {
    return (
      player.pga_displayName ||
      `${player.pga_firstName || ""} ${player.pga_lastName || ""}`.trim() ||
      player.pga_shortName ||
      "Unknown Player"
    );
  };

  // Helper function to get total fantasy points (including cut and bonus)
  const getTotalFantasyPoints = (player: PlayerWithTournamentData) => {
    const total = player.tournamentData.total ?? 0;
    const cut = player.tournamentData.cut ?? 0;
    const bonus = player.tournamentData.bonus ?? 0;
    return total + cut + bonus;
  };

  // Get best single round score
  const getBestRoundScore = (player: PlayerWithTournamentData) => {
    const rounds = [
      player.tournamentData.r1?.total,
      player.tournamentData.r2?.total,
      player.tournamentData.r3?.total,
      player.tournamentData.r4?.total,
    ].filter((r): r is number => r !== undefined && r !== null);
    return rounds.length > 0 ? Math.max(...rounds) : 0;
  };

  // Sort players by different criteria
  const highestScoringPlayers = [...players]
    .sort((a, b) => getTotalFantasyPoints(b) - getTotalFantasyPoints(a))
    .slice(0, 3);

  const lowestScoringPlayers = [...players]
    .filter((p) => getTotalFantasyPoints(p) > 0)
    .sort((a, b) => getTotalFantasyPoints(a) - getTotalFantasyPoints(b))
    .slice(0, 3);

  const bestSingleRoundPlayers = [...players]
    .sort((a, b) => getBestRoundScore(b) - getBestRoundScore(a))
    .slice(0, 3);

  // Render a leaderboard card
  const renderLeaderboardCard = (
    title: string,
    playersList: PlayerWithTournamentData[],
    scoreGetter: (player: PlayerWithTournamentData) => number
  ) => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-emerald-600 px-4 py-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {playersList.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <p>No data available</p>
          </div>
        ) : (
          playersList.map((player, index) => (
            <div key={player.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {/* Rank Badge */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? "bg-yellow-400 text-yellow-900"
                        : index === 1
                        ? "bg-gray-300 text-gray-700"
                        : "bg-orange-400 text-orange-900"
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Player Info */}
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {player.pga_imageUrl ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                        src={player.pga_imageUrl}
                        alt={getPlayerDisplayName(player)}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center ring-2 ring-white">
                        <span className="text-sm font-medium text-gray-600">
                          {getPlayerDisplayName(player).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getPlayerDisplayName(player)}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        {player.pga_countryFlag && (
                          <span className="mr-1">{player.pga_countryFlag}</span>
                        )}
                        {player.pga_country}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="ml-4 flex-shrink-0">
                  <span className="text-lg font-bold text-emerald-600">{scoreGetter(player)}</span>
                  <span className="text-xs text-gray-500 ml-1">pts</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Leaders" />

      {/* Leaderboard Categories */}
      <div className="space-y-4">
        {renderLeaderboardCard(
          "🏆 Highest Scoring Golfers",
          highestScoringPlayers,
          getTotalFantasyPoints
        )}

        {renderLeaderboardCard("⭐ Best Single Round", bestSingleRoundPlayers, getBestRoundScore)}

        {renderLeaderboardCard(
          "📉 Lowest Scoring Golfers",
          lowestScoringPlayers,
          getTotalFantasyPoints
        )}
      </div>

      {/* Coming Soon - Lineup Leaderboards */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700">Team Leaderboards</h3>
          <p className="text-sm text-gray-500">Coming soon</p>
        </div>
        <div className="px-4 py-6 text-center text-gray-400">
          <p className="text-sm">Highest Ever Team • Highest Average Team • Most Wins</p>
        </div>
      </div>
    </div>
  );
};
