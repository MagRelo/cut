// this file will be used to fetch data from the sports radar api. follow the conventions of the pga*.ts files.
// the API key is a .env variable called SPORTS_RADAR_API_KEY
// we need to fetch the following:

import type {
  Tournament,
  TournamentSummary,
  TournamentScores,
  TournamentLeaderboard,
  Player,
  CacheItem,
  PlayerRound,
  LeaderboardPlayer,
} from './types.js';

// Cache storage with 5 minute duration
const cache: { [key: string]: CacheItem<any> } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Update base URL to match working example
const BASE_URL = 'https://api.sportradar.com/golf/trial/pga/v3/en';

async function fetchFromApi<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.SPORTS_RADAR_API_KEY;
  if (!apiKey) {
    throw new Error('SPORTS_RADAR_API_KEY environment variable not set');
  }

  const url = `${BASE_URL}${endpoint}?api_key=${apiKey}`;

  // console.log('fetching from api', `${url}`); -
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      switch (response.status) {
        case 429:
          console.log(response.statusText);
          throw new Error('Rate limit exceeded. Please try again later.');
        case 403:
          throw new Error('Access forbidden. Invalid API key.');
        case 404:
          throw new Error('Resource not found.');
        default:
          throw new Error(`API request failed: ${response.statusText}`);
      }
    }

    const responseData = await response.json();

    return responseData as T;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching from SportsRadar API:', {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}

/**
 * Get the tournament schedule for the current season
 */
export async function getTournamentSchedule(
  year: number = 2025
): Promise<Tournament[]> {
  const cacheKey = `schedule_${year}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<{ tournaments: Tournament[] }>(
    `/${year}/tournaments/schedule.json`
  );
  cache[cacheKey] = { data: data.tournaments, timestamp: now };
  return data.tournaments;
}

/**
 * Get the complete tournament summary including field, rounds, venue, etc.
 */
export async function getTournamentSummary(
  tournamentId: string,
  year: number = 2025
): Promise<TournamentSummary> {
  const cacheKey = `summary_${year}_${tournamentId}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<TournamentSummary>(
    `/${year}/tournaments/${tournamentId}/summary.json`
  );

  cache[cacheKey] = { data, timestamp: now };
  return data;
}

/**
 * Get the field (list of players) for a specific tournament
 */
export async function getTournamentField(
  tournamentId: string,
  year: number = 2025
): Promise<Player[]> {
  const cacheKey = `field_${year}_${tournamentId}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<{
    field: any;
    tournament: {
      field: {
        players: Player[];
      };
    };
  }>(`/${year}/tournaments/${tournamentId}/summary.json`);

  const players = data.field;
  cache[cacheKey] = { data: players, timestamp: now };
  return players;
}

/**
 * Get the live leaderboard for a tournament
 */
export async function getTournamentLeaderboard(
  tournamentId: string,
  year: number = 2025
): Promise<TournamentLeaderboard> {
  const cacheKey = `leaderboard_${year}_${tournamentId}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<TournamentLeaderboard>(
    `/${year}/tournaments/${tournamentId}/leaderboard.json`
  );

  cache[cacheKey] = { data, timestamp: now };
  return data;
}

/**
 * Get scorecards for all players in a tournament round
 */
export async function getPlayersScorecard(
  tournamentId: string,
  roundNumber: string = '01',
  year: number = 2025
): Promise<TournamentScores> {
  const cacheKey = `scorecard_${year}_${tournamentId}_${roundNumber}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<TournamentScores>(
    `/${year}/tournaments/${tournamentId}/rounds/${roundNumber}/scores.json`
  );
  cache[cacheKey] = { data, timestamp: now };
  return data;
}

/**
 * Get all player profiles from SportsRadar API
 */
export async function getAllPlayerProfiles(
  year: number = 2025
): Promise<Player[]> {
  const cacheKey = `player_profiles_${year}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const data = await fetchFromApi<{
    players: Player[];
  }>(`/${year}/players/profiles.json`);

  const result = data.players;
  cache[cacheKey] = { data: result, timestamp: now };
  return result;
}

/**
 * Combined tournament data including leaderboard and all round scorecards
 */
export interface TournamentCompleteData {
  leaderboard: TournamentLeaderboard;
  roundScorecards: {
    [key: string]: TournamentScores;
  };
}

/**
 * Get complete tournament data including leaderboard and all round scorecards in one call
 */
export async function getTournamentCompleteData(
  tournamentId: string,
  year: number = 2025
): Promise<TournamentCompleteData> {
  const rounds = ['01', '02', '03', '04'];

  try {
    // Fetch leaderboard and all round scorecards in parallel
    const [leaderboard, ...roundScores] = await Promise.all([
      getTournamentLeaderboard(tournamentId, year),
      ...rounds.map((round) => getPlayersScorecard(tournamentId, round, year)),
    ]);

    // Combine round scores into an object with round numbers as keys
    const roundScorecards = rounds.reduce((acc, round, index) => {
      acc[round] = roundScores[index];
      return acc;
    }, {} as { [key: string]: TournamentScores });

    return {
      leaderboard,
      roundScorecards,
    };
  } catch (error) {
    console.error('Error fetching complete tournament data:', error);
    throw error;
  }
}
