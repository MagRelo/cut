import type { PlayerWithTournamentData } from "../types.new/player";

/**
 * Sorts players by their tournament leaderboard position
 * Handles edge cases like CUT players, tied positions, and undefined positions
 */
export const sortPlayersByPosition = (
  players: PlayerWithTournamentData[]
): PlayerWithTournamentData[] => {
  return players.slice().sort((a, b) => {
    // Handle cases where position might be "-" or undefined
    const getPosition = (pos: string | undefined) => {
      if (!pos || pos === "-") return Infinity;
      if (pos === "CUT") return Infinity;
      // Remove "T" prefix if present and convert to number
      return parseInt(pos.replace("T", ""));
    };

    // If both players are CUT, sort by total points
    if (
      a.tournamentData.leaderboardPosition === "CUT" &&
      b.tournamentData.leaderboardPosition === "CUT"
    ) {
      return (
        (b.tournamentData.total || 0) +
        (b.tournamentData.cut || 0) +
        (b.tournamentData.bonus || 0) -
        ((a.tournamentData.total || 0) +
          (a.tournamentData.cut || 0) +
          (a.tournamentData.bonus || 0))
      );
    }

    return (
      getPosition(a.tournamentData.leaderboardPosition) -
      getPosition(b.tournamentData.leaderboardPosition)
    );
  });
};
