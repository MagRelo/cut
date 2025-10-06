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

  // Sort players by tournamentData.total (higher is better)
  const sortedPlayers = [...players].sort((a, b) => {
    const totalA = a.tournamentData.total ?? -999;
    const totalB = b.tournamentData.total ?? -999;
    return totalB - totalA;
  });

  const formatScore = (score: number | undefined) => {
    if (score === undefined || score === null) return "-";
    return score.toString();
  };

  const getPlayerDisplayName = (player: PlayerWithTournamentData) => {
    return (
      player.pga_displayName ||
      `${player.pga_firstName || ""} ${player.pga_lastName || ""}`.trim() ||
      player.pga_shortName ||
      "Unknown Player"
    );
  };

  return (
    <div className="p-4">
      <PageHeader title="Leaderboard" className="mb-6" />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  R1
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  R2
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  R3
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  R4
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  POS
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        {player.pga_imageUrl ? (
                          <img
                            className="h-8 w-8 rounded-full object-cover"
                            src={player.pga_imageUrl}
                            alt={getPlayerDisplayName(player)}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {getPlayerDisplayName(player).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {getPlayerDisplayName(player)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          {player.pga_country && <span className="ml-1">{player.pga_country}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900 hidden sm:table-cell">
                    {player.tournamentData.r1?.total !== undefined
                      ? formatScore(player.tournamentData.r1.total)
                      : "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900 hidden sm:table-cell">
                    {player.tournamentData.r2?.total !== undefined
                      ? formatScore(player.tournamentData.r2.total)
                      : "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900 hidden sm:table-cell">
                    {player.tournamentData.r3?.total !== undefined
                      ? formatScore(player.tournamentData.r3.total)
                      : "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900 hidden sm:table-cell">
                    {player.tournamentData.r4?.total !== undefined
                      ? formatScore(player.tournamentData.r4.total)
                      : "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                    {player.tournamentData.leaderboardPosition || "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                    {player.tournamentData.total !== undefined
                      ? formatScore(player.tournamentData.total)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedPlayers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No players found for this tournament</p>
        </div>
      )}
    </div>
  );
};
