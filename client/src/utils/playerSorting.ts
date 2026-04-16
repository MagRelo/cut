import type { PlayerWithTournamentData } from "../types/player";

const PLAYER_SORT_BUCKET = {
  noData: 205,
  wd: 203,
  cut: 202,
  noPosition: 201,
} as const;

const getPlayerSortIndex = (player?: PlayerWithTournamentData | null) => {
  if (!player) return PLAYER_SORT_BUCKET.noData;

  const score = player.tournamentData?.leaderboardTotal?.trim();
  const position = player.tournamentData?.leaderboardPosition?.trim().toUpperCase();

  if (!score) return PLAYER_SORT_BUCKET.noData;
  if (position === "WD") return PLAYER_SORT_BUCKET.wd;
  if (position === "CUT") return PLAYER_SORT_BUCKET.cut;
  if (position === "-") return PLAYER_SORT_BUCKET.noPosition;
  if (score === "E") return 0;

  const numericScore = Number.parseInt(score, 10);
  return Number.isNaN(numericScore) ? PLAYER_SORT_BUCKET.noData : numericScore;
};

const getNumericPosition = (player: PlayerWithTournamentData) => {
  const rawPosition = player.tournamentData?.leaderboardPosition?.trim().toUpperCase() || "";
  const normalizedPosition = rawPosition.startsWith("T") ? rawPosition.slice(1) : rawPosition;
  const parsedPosition = Number.parseInt(normalizedPosition, 10);
  return Number.isNaN(parsedPosition) ? Number.POSITIVE_INFINITY : parsedPosition;
};

const comparePlayersByName = (a: PlayerWithTournamentData, b: PlayerWithTournamentData) => {
  const aLastName = (a.pga_lastName || "").trim();
  const bLastName = (b.pga_lastName || "").trim();
  const lastNameDiff = aLastName.localeCompare(bLastName);
  if (lastNameDiff !== 0) return lastNameDiff;

  const aFirstName = (a.pga_firstName || a.pga_displayName || "").trim();
  const bFirstName = (b.pga_firstName || b.pga_displayName || "").trim();
  return aFirstName.localeCompare(bFirstName);
};

export const comparePlayersByLeaderboard = (
  a: PlayerWithTournamentData,
  b: PlayerWithTournamentData,
  options?: { sortByNameOnly?: boolean },
) => {
  if (!options?.sortByNameOnly) {
    const sortIndexDiff = getPlayerSortIndex(a) - getPlayerSortIndex(b);
    if (sortIndexDiff !== 0) return sortIndexDiff;

    const positionDiff = getNumericPosition(a) - getNumericPosition(b);
    if (positionDiff !== 0) return positionDiff;
  }

  return comparePlayersByName(a, b);
};

export const sortPlayersByLeaderboard = (
  players: PlayerWithTournamentData[],
  options?: { sortByNameOnly?: boolean },
) => [...players].sort((a, b) => comparePlayersByLeaderboard(a, b, options));
